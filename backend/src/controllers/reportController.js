const fs = require('fs/promises');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../config/database');
const reportUpload = require('../middleware/reportUpload');
const { notifyAdmins } = require('../services/reportNotifications');

const isAdmin = (role) => ['admin', 'super_admin'].includes(role);
const isDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const parseReportData = (value) => {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Report data must be a JSON object');
  }
  return data;
};

const summarize = (data) => {
  const sales = Array.isArray(data.sales) ? data.sales : [];
  const salesTotal = sales.reduce((sum, entry) => {
    const total = Number(entry.total ?? (Number(entry.quantity || 0) * Number(entry.unit_price || 0)));
    return sum + (Number.isFinite(total) && total > 0 ? total : 0);
  }, 0);
  const cashCollected = Number(data.cash_collected || 0);
  const transactionCount = Array.isArray(data.transactions)
    ? data.transactions.length
    : Number(data.transaction_count || 0);

  if (!Number.isFinite(cashCollected) || cashCollected < 0
    || !Number.isInteger(transactionCount) || transactionCount < 0) {
    throw new Error('Cash collected and transaction count must be non-negative numbers');
  }

  return { salesTotal, cashCollected, transactionCount };
};

const actorColumns = (actor) => ({
  userId: isAdmin(actor.role) ? null : actor.id,
  adminId: isAdmin(actor.role) ? actor.id : null
});

const writeAudit = async (connection, reportId, actor, action, fromStatus, toStatus, note, changes) => {
  const ids = actorColumns(actor);
  await connection.query(
    `INSERT INTO daily_report_audit
      (report_id, actor_user_id, actor_admin_id, actor_role, action, from_status, to_status, note, changes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [reportId, ids.userId, ids.adminId, actor.role, action, fromStatus, toStatus, note || null,
      changes ? JSON.stringify(changes) : null]
  );
};

const getReport = async (connection, reportId, lock = false) => {
  const [reports] = await connection.query(
        `SELECT r.id, DATE_FORMAT(r.report_date, '%Y-%m-%d') AS report_date,
          r.shift_name, r.agent_id, r.station_id, r.status, r.report_data,
          r.sales_total, r.cash_collected, r.transaction_count, r.submitted_at,
          r.reviewed_at, r.reviewed_by_user_id, r.reviewed_by_admin_id, r.review_note,
          r.created_at, r.updated_at, a.name AS agent_name, a.email AS agent_email,
            s.name AS station_name,
            COALESCE(ru.name, ra.name) AS reviewer_name
     FROM daily_reports r
     JOIN users a ON a.id = r.agent_id
     JOIN stations s ON s.id = r.station_id
     LEFT JOIN users ru ON ru.id = r.reviewed_by_user_id
     LEFT JOIN admins ra ON ra.id = r.reviewed_by_admin_id
     WHERE r.id = ?${lock ? ' FOR UPDATE' : ''}`,
    [reportId]
  );
  return reports[0];
};

const canAccess = (actor, report) => {
  if (!report) return false;
  if (isAdmin(actor.role)) return true;
  return actor.role === 'agent' && Number(actor.id) === Number(report.agent_id);
};

const reportAttachments = async (reportId) => {
  const [attachments] = await db.query(
    `SELECT id, original_name, mime_type, file_size, created_at
     FROM daily_report_attachments WHERE report_id = ? ORDER BY created_at`,
    [reportId]
  );
  return attachments;
};

const getFilteredReports = async (req, statusFilter) => {
  const { start_date: startDate, end_date: endDate, status, station_id: requestedStation } = req.query;
  if ((startDate && !isDate(startDate)) || (endDate && !isDate(endDate))) {
    return { error: 'Dates must use YYYY-MM-DD format' };
  }

  const conditions = [];
  const params = [];
  if (req.user.role === 'agent') {
    conditions.push('r.agent_id = ?');
    params.push(req.user.id);
  } else if (requestedStation && isAdmin(req.user.role)) {
    conditions.push('r.station_id = ?');
    params.push(requestedStation);
  }
  if (startDate) { conditions.push('r.report_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('r.report_date <= ?'); params.push(endDate); }
  if (statusFilter) {
    conditions.push('r.status = ?');
    params.push(statusFilter);
  } else if (status) {
    if (!['draft', 'submitted', 'approved', 'returned'].includes(status)) {
      return { error: 'Invalid report status' };
    }
    conditions.push('r.status = ?');
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [reports] = await db.query(
        `SELECT r.id, DATE_FORMAT(r.report_date, '%Y-%m-%d') AS report_date,
          r.shift_name, r.agent_id, r.station_id,
            r.status, r.report_data, r.sales_total, r.cash_collected,
            r.transaction_count, r.submitted_at, r.reviewed_at, r.review_note,
            r.created_at, r.updated_at, a.name AS agent_name, s.name AS station_name
     FROM daily_reports r
     JOIN users a ON a.id = r.agent_id
     JOIN stations s ON s.id = r.station_id
     ${where}
     ORDER BY r.report_date DESC, r.created_at DESC`,
    params
  );
  return { reports };
};

const create = async (req, res) => {
  if (!req.user.stationId) return res.status(403).json({ message: 'Agent account is not assigned to a station' });
  const reportDate = req.body.report_date || new Date().toISOString().slice(0, 10);
  const shiftName = String(req.body.shift_name || 'day').trim();
  if (!isDate(reportDate)) return res.status(400).json({ message: 'report_date must use YYYY-MM-DD format' });
  if (!shiftName || shiftName.length > 80) return res.status(400).json({ message: 'shift_name must be 1 to 80 characters' });

  let data;
  let totals;
  try {
    data = parseReportData(req.body.report_data || {});
    totals = summarize(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid report data' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO daily_reports
        (report_date, shift_name, agent_id, station_id, report_data, sales_total, cash_collected, transaction_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportDate, shiftName, req.user.id, req.user.stationId, JSON.stringify(data),
        totals.salesTotal, totals.cashCollected, totals.transactionCount]
    );
    await writeAudit(connection, result.insertId, req.user, 'created', null, 'draft', null, { report_data: data });
    await connection.commit();
    const report = await getReport(connection, result.insertId);
    res.status(201).json(report);
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A report already exists for this shift and date' });
    }
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Unable to create report' });
  } finally {
    connection.release();
  }
};

const list = async (req, res) => {
  try {
    const result = await getFilteredReports(req);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (result.reports.length) {
      const reportIds = result.reports.map((report) => report.id);
      const [attachments] = await db.query(
        `SELECT id, report_id, original_name, mime_type, file_size, created_at
         FROM daily_report_attachments WHERE report_id IN (?) ORDER BY created_at`,
        [reportIds]
      );
      const attachmentMap = new Map();
      attachments.forEach((attachment) => {
        if (!attachmentMap.has(attachment.report_id)) attachmentMap.set(attachment.report_id, []);
        attachmentMap.get(attachment.report_id).push(attachment);
      });
      result.reports.forEach((report) => { report.attachments = attachmentMap.get(report.id) || []; });
    }
    res.json(result.reports);
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ message: 'Unable to load reports' });
  }
};

const read = async (req, res) => {
  try {
    const report = await getReport(db, req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (!canAccess(req.user, report)) return res.status(403).json({ message: 'You cannot view this report' });
    report.attachments = await reportAttachments(report.id);
    res.json(report);
  } catch (error) {
    console.error('Read report error:', error);
    res.status(500).json({ message: 'Unable to load report' });
  }
};

const update = async (req, res) => {
  let data;
  let totals;
  try {
    data = parseReportData(req.body.report_data);
    totals = summarize(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid report data' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const report = await getReport(connection, req.params.id, true);
    if (!report) {
      await connection.rollback();
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'agent' || !canAccess(req.user, report)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Only the assigned agent can edit this report' });
    }
    if (!['draft', 'returned'].includes(report.status)) {
      await connection.rollback();
      return res.status(409).json({ message: 'Submitted reports are locked' });
    }

    const previousStatus = report.status;
    await connection.query(
      `UPDATE daily_reports
      SET report_data = ?, sales_total = ?, cash_collected = ?, transaction_count = ?, status = 'draft', review_note = NULL
       WHERE id = ?`,
      [JSON.stringify(data), totals.salesTotal, totals.cashCollected, totals.transactionCount, report.id]
    );
    await writeAudit(connection, report.id, req.user, 'updated', previousStatus, 'draft', null,
      { previous: report.report_data, current: data });
    await connection.commit();
    res.json(await getReport(connection, report.id));
  } catch (error) {
    await connection.rollback();
    console.error('Update report error:', error);
    res.status(500).json({ message: 'Unable to update report' });
  } finally {
    connection.release();
  }
};

const submit = async (req, res) => {
  const connection = await db.getConnection();
  let report;
  try {
    await connection.beginTransaction();
    report = await getReport(connection, req.params.id, true);
    if (!report) {
      await connection.rollback();
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'agent' || !canAccess(req.user, report)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Only the assigned agent can submit this report' });
    }
    if (report.status !== 'draft') {
      await connection.rollback();
      return res.status(409).json({ message: 'Only a draft report can be submitted' });
    }
    const [proofFiles] = await connection.query(
      `SELECT id FROM daily_report_attachments
       WHERE report_id = ? AND mime_type IN (
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/octet-stream'
       ) LIMIT 1`,
      [report.id]
    );
    if (!proofFiles.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Attach an Excel work-proof file (.xls or .xlsx) before submitting' });
    }

    await connection.query(
      `UPDATE daily_reports SET status = 'submitted', submitted_at = NOW(), review_note = NULL,
       reviewed_at = NULL, reviewed_by_user_id = NULL, reviewed_by_admin_id = NULL WHERE id = ?`,
      [report.id]
    );
    await writeAudit(connection, report.id, req.user, 'submitted', 'draft', 'submitted', null);
    await connection.commit();
    notifyAdmins(report.id);
    res.json(await getReport(connection, report.id));
  } catch (error) {
    await connection.rollback();
    console.error('Submit report error:', error);
    res.status(500).json({ message: 'Unable to submit report' });
  } finally {
    connection.release();
  }
};

const review = async (req, res) => {
  const { decision, note } = req.body;
  if (!['approved', 'returned'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be approved or returned' });
  }
  if (decision === 'returned' && !String(note || '').trim()) {
    return res.status(400).json({ message: 'A note is required when returning a report' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const report = await getReport(connection, req.params.id, true);
    if (!report) {
      await connection.rollback();
      return res.status(404).json({ message: 'Report not found' });
    }
    if (!isAdmin(req.user.role)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Only admins can review reports' });
    }
    if (report.status !== 'submitted') {
      await connection.rollback();
      return res.status(409).json({ message: 'Only submitted reports can be reviewed' });
    }

    const ids = actorColumns(req.user);
    await connection.query(
      `UPDATE daily_reports
       SET status = ?, reviewed_at = NOW(), reviewed_by_user_id = ?, reviewed_by_admin_id = ?, review_note = ?
       WHERE id = ?`,
      [decision, ids.userId, ids.adminId, String(note || '').trim() || null, report.id]
    );
    await writeAudit(connection, report.id, req.user, decision, 'submitted', decision, note);
    await connection.commit();
    res.json(await getReport(connection, report.id));
  } catch (error) {
    await connection.rollback();
    console.error('Review report error:', error);
    res.status(500).json({ message: 'Unable to review report' });
  } finally {
    connection.release();
  }
};

const pendingAgents = async (req, res) => {
  const reportDate = req.query.date || new Date().toISOString().slice(0, 10);
  const shiftName = String(req.query.shift_name || 'day').trim();
  if (!isDate(reportDate) || !shiftName) {
    return res.status(400).json({ message: 'A valid date and shift_name are required' });
  }
  try {
    const stationId = isAdmin(req.user.role) ? req.query.station_id : null;
    const stationCondition = stationId ? 'AND u.station_id = ?' : '';
    const params = stationId
      ? [reportDate, shiftName, stationId, reportDate, shiftName]
      : [reportDate, shiftName, reportDate, shiftName];
    const [agents] = await db.query(
      `SELECT u.id, u.name, u.email,
              (SELECT r.status FROM daily_reports r
               WHERE r.agent_id = u.id AND r.report_date = ? AND r.shift_name = ? LIMIT 1) AS report_status
       FROM users u
       WHERE u.role = 'agent' AND u.status = 'active' ${stationCondition}
         AND NOT EXISTS (
           SELECT 1 FROM daily_reports r
           WHERE r.agent_id = u.id AND r.report_date = ? AND r.shift_name = ?
             AND r.status IN ('submitted', 'approved', 'returned')
         )
       ORDER BY u.name`,
      params
    );
    res.json(agents);
  } catch (error) {
    console.error('Pending agents error:', error);
    res.status(500).json({ message: 'Unable to load pending agents' });
  }
};

const periodDates = (period, date) => {
  if (!isDate(date)) throw new Error('date must use YYYY-MM-DD format');
  const value = new Date(`${date}T00:00:00Z`);
  const start = new Date(value);
  const end = new Date(value);
  if (period === 'week') {
    const mondayOffset = (value.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - mondayOffset);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
  } else if (period === 'month') {
    start.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else if (period !== 'day') {
    throw new Error('period must be day, week, or month');
  }
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
};

const dashboard = async (req, res) => {
  let startDate;
  let endDate;
  try {
    [startDate, endDate] = periodDates(req.query.period || 'day', req.query.date || new Date().toISOString().slice(0, 10));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const conditions = ['report_date BETWEEN ? AND ?'];
  const params = [startDate, endDate];
  if (req.query.station_id && isAdmin(req.user.role)) {
    conditions.push('station_id = ?');
    params.push(req.query.station_id);
  }
  const where = conditions.join(' AND ');

  try {
    const [totals] = await db.query(
      `SELECT COUNT(*) AS report_count,
              SUM(status = 'approved') AS approved_count,
              SUM(status = 'submitted') AS submitted_count,
              SUM(status = 'returned') AS returned_count,
              COALESCE(SUM(sales_total), 0) AS sales_total,
              COALESCE(SUM(cash_collected), 0) AS cash_collected,
              COALESCE(SUM(transaction_count), 0) AS transaction_count
       FROM daily_reports WHERE ${where}`,
      params
    );
    const [byDate] = await db.query(
      `SELECT DATE_FORMAT(report_date, '%Y-%m-%d') AS report_date, SUM(sales_total) AS sales_total,
              SUM(cash_collected) AS cash_collected, COUNT(*) AS report_count
       FROM daily_reports WHERE ${where}
       GROUP BY report_date ORDER BY report_date`,
      params
    );
    const [byAgent] = await db.query(
      `SELECT u.id AS agent_id, u.name AS agent_name,
              COUNT(*) AS report_count, SUM(r.sales_total) AS sales_total
       FROM daily_reports r JOIN users u ON u.id = r.agent_id
       WHERE ${where} GROUP BY u.id, u.name ORDER BY sales_total DESC`,
      params
    );
    res.json({ period: req.query.period || 'day', start_date: startDate, end_date: endDate,
      totals: totals[0], by_date: byDate, by_agent: byAgent });
  } catch (error) {
    console.error('Report dashboard error:', error);
    res.status(500).json({ message: 'Unable to load report dashboard' });
  }
};

const approvedSummary = async (req, res) => {
  try {
    const result = await getFilteredReports(req, 'approved');
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    res.json(result.reports);
  } catch (error) {
    console.error('Approved report summary error:', error);
    res.status(500).json({ message: 'Unable to load approved reports' });
  }
};

const exportExcel = async (req, res) => {
  try {
    const result = await getFilteredReports(req);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daily Reports');
    sheet.columns = [
      { header: 'Date', key: 'report_date', width: 14 },
      { header: 'Shift', key: 'shift_name', width: 18 },
      { header: 'Station', key: 'station_name', width: 28 },
      { header: 'Agent', key: 'agent_name', width: 24 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Sales Total', key: 'sales_total', width: 16 },
      { header: 'Cash Collected', key: 'cash_collected', width: 18 },
      { header: 'Transactions', key: 'transaction_count', width: 16 },
      { header: 'Review Note', key: 'review_note', width: 40 },
      { header: 'Report Data (JSON)', key: 'report_data', width: 70 }
    ];
    sheet.getRow(1).font = { bold: true };
    result.reports.forEach((report) => sheet.addRow({
      ...report,
      report_data: JSON.stringify(report.report_data)
    }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-reports.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export reports to Excel error:', error);
    res.status(500).json({ message: 'Unable to export reports' });
  }
};

const exportPdf = async (req, res) => {
  try {
    const result = await getFilteredReports(req);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="daily-reports.pdf"');
    const document = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
    document.pipe(res);
    document.fontSize(18).text('Daily Reports', { align: 'center' });
    document.moveDown();
    result.reports.forEach((report, index) => {
      if (index > 0) document.addPage();
      document.fontSize(13).text(`${report.report_date} | ${report.shift_name} | ${report.status}`);
      document.fontSize(10).text(`Station: ${report.station_name} | Agent: ${report.agent_name}`);
      document.text(`Sales: ${report.sales_total} | Cash collected: ${report.cash_collected} | Transactions: ${report.transaction_count}`);
      if (report.review_note) document.text(`Review note: ${report.review_note}`);
      document.moveDown(0.5);
      document.fontSize(9).text(JSON.stringify(report.report_data, null, 2), { width: 510 });
    });
    document.end();
  } catch (error) {
    console.error('Export reports to PDF error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Unable to export reports' });
  }
};

const auditTrail = async (req, res) => {
  try {
    const report = await getReport(db, req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (!canAccess(req.user, report)) return res.status(403).json({ message: 'You cannot view this report history' });
    const [events] = await db.query(
      `SELECT al.*, COALESCE(u.name, a.name) AS actor_name
       FROM daily_report_audit al
       LEFT JOIN users u ON u.id = al.actor_user_id
       LEFT JOIN admins a ON a.id = al.actor_admin_id
       WHERE al.report_id = ? ORDER BY al.created_at, al.id`,
      [report.id]
    );
    res.json(events);
  } catch (error) {
    console.error('Report audit error:', error);
    res.status(500).json({ message: 'Unable to load report history' });
  }
};

const addAttachments = async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ message: 'Select at least one attachment' });
  const cleanup = () => Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const report = await getReport(connection, req.params.id, true);
    if (!report) {
      await connection.rollback();
      await cleanup();
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'agent' || !canAccess(req.user, report)) {
      await connection.rollback();
      await cleanup();
      return res.status(403).json({ message: 'Only the assigned agent can attach files' });
    }
    if (!['draft', 'returned'].includes(report.status)) {
      await connection.rollback();
      await cleanup();
      return res.status(409).json({ message: 'Attachments are locked after submission' });
    }

    for (const file of files) {
      await connection.query(
        `INSERT INTO daily_report_attachments
          (report_id, uploaded_by_user_id, storage_key, original_name, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [report.id, req.user.id, path.basename(file.filename), file.originalname, file.mimetype, file.size]
      );
    }
    await writeAudit(connection, report.id, req.user, 'attachment_added', report.status, report.status, null,
      { files: files.map((file) => file.originalname) });
    await connection.commit();
    res.status(201).json(await reportAttachments(report.id));
  } catch (error) {
    await connection.rollback();
    await cleanup();
    console.error('Report attachment error:', error);
    res.status(500).json({ message: 'Unable to save report attachments' });
  } finally {
    connection.release();
  }
};

const downloadAttachment = async (req, res) => {
  try {
    const report = await getReport(db, req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (!canAccess(req.user, report)) return res.status(403).json({ message: 'You cannot access this attachment' });
    const [attachments] = await db.query(
      'SELECT storage_key, original_name FROM daily_report_attachments WHERE id = ? AND report_id = ?',
      [req.params.attachmentId, report.id]
    );
    if (!attachments[0]) return res.status(404).json({ message: 'Attachment not found' });
    const filePath = path.join(reportUpload.directory, path.basename(attachments[0].storage_key));
    res.download(filePath, attachments[0].original_name);
  } catch (error) {
    console.error('Download report attachment error:', error);
    res.status(500).json({ message: 'Unable to download attachment' });
  }
};

const removeAttachment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const report = await getReport(connection, req.params.id, true);
    if (!report) {
      await connection.rollback();
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'agent' || !canAccess(req.user, report)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Only the assigned agent can remove attachments' });
    }
    if (!['draft', 'returned'].includes(report.status)) {
      await connection.rollback();
      return res.status(409).json({ message: 'Attachments are locked after submission' });
    }
    const [attachments] = await connection.query(
      'SELECT storage_key, original_name FROM daily_report_attachments WHERE id = ? AND report_id = ?',
      [req.params.attachmentId, report.id]
    );
    if (!attachments[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Attachment not found' });
    }
    await connection.query('DELETE FROM daily_report_attachments WHERE id = ?', [req.params.attachmentId]);
    await writeAudit(connection, report.id, req.user, 'attachment_removed', report.status, report.status, null,
      { file: attachments[0].original_name });
    await connection.commit();
    await fs.unlink(path.join(reportUpload.directory, path.basename(attachments[0].storage_key))).catch(() => {});
    res.json({ message: 'Attachment removed' });
  } catch (error) {
    await connection.rollback();
    console.error('Remove report attachment error:', error);
    res.status(500).json({ message: 'Unable to remove attachment' });
  } finally {
    connection.release();
  }
};

module.exports = {
  create,
  list,
  read,
  update,
  submit,
  review,
  pendingAgents,
  dashboard,
  approvedSummary,
  exportExcel,
  exportPdf,
  auditTrail,
  addAttachments,
  downloadAttachment,
  removeAttachment
};