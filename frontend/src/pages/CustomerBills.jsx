import React, { useEffect, useState } from 'react';
import { portalService } from '../services/portalService';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomerPortalLayout from '../layouts/CustomerPortalLayout';
import PaymentInstructions from '../components/PaymentInstructions';

const CustomerBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [proofFiles, setProofFiles] = useState({});
  const [method, setMethod] = useState('mobile_money');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setBills(await portalService.getMyBills());
  };

  useEffect(() => {
    load()
      .catch(() => setError('Unable to load bills.'))
      .finally(() => setLoading(false));
  }, []);

  const submitProof = async (event, bill) => {
    event.preventDefault();
    const proof = proofFiles[bill.id];
    if (!proof) {
      setError('Choose a payment receipt image or PDF first.');
      return;
    }
    setSubmittingId(bill.id);
    setMessage('');
    setError('');
    try {
      const result = await portalService.submitPaymentProof(bill.id, method, proof);
      await load();
      setProofFiles((current) => ({ ...current, [bill.id]: null }));
      setMessage(result.message || 'Payment proof submitted for station review.');
    } catch (err) {
      setError(err.response?.data?.message || 'Payment proof could not be submitted.');
    } finally {
      setSubmittingId(null);
    }
  };

  const unpaid = bills.filter((b) => b.status === 'unpaid' || b.status === 'overdue');
  const paid = bills.filter((b) => b.status === 'paid');

  if (loading) return <LoadingSpinner />;

  return (
    <CustomerPortalLayout
      title="Pay bills"
      subtitle="Pay using your selected method, then submit the receipt so your station can verify it."
    >
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {unpaid.length > 0 && <PaymentInstructions />}

      <div className="mb-6 bg-white rounded-lg shadow-md p-4 max-w-sm">
        <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
        <select id="payment-method" className="input-field" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="mobile_money">Mobile Money</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>

      <h2 className="text-xl font-bold mb-4">Outstanding</h2>
      {unpaid.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-gray-600 mb-10">No unpaid bills.</div>
      ) : (
        <div className="space-y-4 mb-10">
          {unpaid.map((bill) => (
            <div key={bill.id} className="bg-white rounded-lg shadow-md p-5 flex flex-wrap justify-between gap-4 items-center">
              <div>
                <h3 className="font-semibold text-lg">{bill.description}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Due {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '—'} · {bill.status}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-primary-800">
                  {Number(bill.amount).toLocaleString()} RWF
                </span>
              </div>
              {bill.proof_status === 'pending' ? (
                <p className="w-full border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
                  Payment proof submitted{bill.proof_submitted_at ? ` on ${new Date(bill.proof_submitted_at).toLocaleDateString()}` : ''}. Awaiting station verification.
                </p>
              ) : (
                <form className="w-full border-t border-gray-100 pt-4" onSubmit={(event) => submitProof(event, bill)}>
                  {bill.proof_status === 'rejected' && (
                    <p className="mb-3 text-sm text-red-700">Receipt was rejected: {bill.proof_review_note || 'Please upload a clear, valid receipt.'}</p>
                  )}
                  <p className="mb-3 text-sm text-gray-700">After paying by {method.replace('_', ' ')}, attach your receipt. Your bill stays unpaid until the station verifies the payment.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(event) => setProofFiles((current) => ({ ...current, [bill.id]: event.target.files?.[0] || null }))}
                      required
                      className="max-w-full text-sm"
                    />
                    <button className="btn-primary" disabled={submittingId === bill.id}>
                      {submittingId === bill.id ? 'Submitting...' : 'Submit payment proof'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Receipt document: PDF, JPG, PNG, or WEBP. Maximum size 10 MB.</p>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Payment history</h2>
      {paid.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-gray-600">No paid bills yet.</div>
      ) : (
        <div className="space-y-3">
          {paid.map((bill) => (
            <div key={bill.id} className="bg-white rounded-lg shadow-md p-4 flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-medium">{bill.description}</p>
                <p className="text-sm text-gray-600">
                  Paid {bill.paid_at ? new Date(bill.paid_at).toLocaleString() : ''} via {bill.payment_method}
                </p>
              </div>
              <span className="font-semibold text-green-700">{Number(bill.amount).toLocaleString()} RWF</span>
            </div>
          ))}
        </div>
      )}
    </CustomerPortalLayout>
  );
};

export default CustomerBills;
