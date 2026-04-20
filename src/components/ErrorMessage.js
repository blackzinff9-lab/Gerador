"use client";

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center"
    >
      <p className="text-2xl" aria-hidden="true">
        😕
      </p>
      <p className="mt-2 text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
