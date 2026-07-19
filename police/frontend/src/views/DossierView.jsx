import { useEffect, useState } from 'react';
import { api, downloadUrl } from '../api/client.js';
import { ViewFrame, Panel, ErrorNote, Idx } from '../ui/kit.jsx';
import { SealGlyph } from '../ui/glyphs.jsx';

/**
 * Evidence dossiers (/api/reports) — real PDFs generated from live DB rows,
 * SHA-256 sealed, audit-logged, and served back for download. The hash is
 * the artifact: it is what makes the export court-defensible.
 */

const REPORT_TYPES = [
  {
    id: 'repeat_offenders',
    name: 'Repeat Offender Register',
    desc: 'Priors ≥ 2, ranked by risk score — the recidivism picture for review meetings.',
  },
  {
    id: 'case_sla_breach',
    name: 'SLA Breach Register',
    desc: 'Every FIR past its statutory deadline, with days overdue.',
  },
  {
    id: 'district_performance',
    name: 'District Performance',
    desc: 'Case load, disposal, and pendency by district.',
  },
];

export default function DossierView() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [busyType, setBusyType] = useState(null);

  const refresh = () => api.get('/reports').then(setReports).catch(setError);
  useEffect(() => { refresh(); }, []);

  const generate = async (reportType) => {
    setBusyType(reportType);
    setError(null);
    try {
      await api.post('/reports/generate', { report_type: reportType, format: 'pdf' });
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusyType(null);
    }
  };

  return (
    <ViewFrame
      kicker="SHA-256 sealed · audit-logged · BSA §63 chain-of-custody statement in every footer"
      title="Evidence that"
      titleEm="holds up."
      lede="Dossiers are generated from live database rows, hashed over the final bytes, and recorded in the audit log. The hash printed here must match the file you hand to the court."
    >
      {error && <ErrorNote error={error} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {REPORT_TYPES.map((t, i) => (
          <Panel key={t.id} title={t.name} tag={`0${i + 1}`}>
            <div className="flex h-full flex-col justify-between gap-5">
              <p className="text-sm leading-relaxed text-ink-soft">{t.desc}</p>
              <button className="btn-ink" onClick={() => generate(t.id)} disabled={busyType !== null}>
                <SealGlyph className="h-4 w-4" />
                {busyType === t.id ? 'Sealing PDF…' : 'Generate & seal'}
              </button>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Sealed register" tag={`${reports.length} dossier(s) this process lifetime`}>
        <ol className="divide-y divide-amber-100">
          {reports.map((r, i) => (
            <li key={r.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
              <Idx n={i + 1} />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {REPORT_TYPES.find((t) => t.id === r.report_type)?.name || r.report_type}
                </p>
                <p className="mt-0.5 break-all font-mono text-[0.64rem] text-ink-faint">
                  sha256 · {r.sha256 || r.hash || '—'}
                </p>
                <p className="font-mono text-[0.62rem] uppercase tracking-tag text-ink-faint">
                  {r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''}
                </p>
              </div>
              <a className="btn-line" href={r.download_href || downloadUrl(r.id)} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </li>
          ))}
          {!reports.length && (
            <p className="py-8 text-sm text-ink-faint">
              No dossiers sealed yet in this backend process. Generate one above — the register
              is in-memory and resets with the service, but every export stays in the audit log.
            </p>
          )}
        </ol>
      </Panel>
    </ViewFrame>
  );
}
