import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

export const ThankYouPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const refNo = searchParams.get('ref') || 'APP-2026';
  const name = searchParams.get('name') || 'Candidate';
  const jobTitle = searchParams.get('job') || 'Position';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-black text-slate-900">Application Submitted!</h2>
        <p className="text-sm text-slate-600 mt-2">
          Thank you <span className="font-semibold text-slate-900">{name}</span>, your application for{' '}
          <span className="font-semibold text-slate-900">{jobTitle}</span> has been received by Mastered Skill Academy.
        </p>

        {/* Reference Box */}
        <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Application Reference Number</p>
          <p className="text-xl font-black text-brand-700 mt-0.5">{refNo}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" /> Resume uploaded securely to Drive
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Our HR team is screening applications. If your profile matches our requirements, you will be contacted via WhatsApp / Phone for the interview schedule.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold shadow-md transition"
        >
          Return to Home <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
