import React, { useState } from 'react';

const EmailVerificationModal = ({ email, onClose, onResend }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (resending || !onResend) return;
    setResending(true);
    try {
      await onResend();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      // error handled by parent
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Email icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-600 mb-1">
          We sent a verification link to
        </p>
        <p className="text-teal-600 font-semibold mb-4">{email}</p>
        <p className="text-sm text-gray-500 mb-6">
          Click the link in your email to verify your account and complete registration. The link will expire in 24 hours.
        </p>

        {/* Tips */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Didn&apos;t receive it?</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Check your spam or junk folder</li>
            <li>• Make sure <span className="font-medium text-gray-700">{email}</span> is correct</li>
            <li>• Allow a few minutes for delivery</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          {onResend && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition ${
                resent
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
              } disabled:opacity-60`}
            >
              {resent ? 'Email resent!' : resending ? 'Resending...' : 'Resend verification email'}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
