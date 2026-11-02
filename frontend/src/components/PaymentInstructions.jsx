import React from 'react';
import { Link } from 'react-router-dom';
import { paymentDetails } from '../config/paymentDetails';

const PaymentInstructions = ({ forOrder = false }) => (
  <section className="mb-6 border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase text-emerald-800">Payment options</p>
        <h2 className="mt-1 text-lg font-bold text-gray-900">Pay by Mobile Money or bank transfer</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          {forOrder
            ? 'Pay using your Mobile Money or bank app, then attach the receipt in the order form below. The station verifies payment before processing your order.'
            : 'For an outstanding invoice, pay using your Mobile Money or bank app, then upload its receipt below for station verification.'}
        </p>
      </div>
      {forOrder
        ? <a href="#order-payment-proof" className="text-sm font-semibold text-primary-700 hover:underline">Go to order receipt upload</a>
        : <Link to="/portal" className="text-sm font-semibold text-primary-700 hover:underline">Back to orders</Link>}
    </div>
    {paymentDetails.isDemo && (
      <p role="status" className="mt-4 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
        DEMO PAYMENT DETAILS: do not send real money to these placeholder accounts.
      </p>
    )}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Mobile Money</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex flex-wrap gap-2"><dt className="text-gray-500">Pay code:</dt><dd className="font-semibold">{paymentDetails.momoCode}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-gray-500">Payee:</dt><dd>{paymentDetails.momoPayee}</dd></div>
        </dl>
      </div>
      <div className="border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Bank transfer</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex flex-wrap gap-2"><dt className="text-gray-500">Bank:</dt><dd>{paymentDetails.bankName}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-gray-500">Account name:</dt><dd>{paymentDetails.bankAccountName}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="text-gray-500">Account number:</dt><dd className="font-semibold">{paymentDetails.bankAccountNumber}</dd></div>
        </dl>
      </div>
    </div>
  </section>
);

export default PaymentInstructions;
