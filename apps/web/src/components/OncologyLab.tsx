// Oncology Analysis Lab — addresses the top math-based pain points in oncology.
import { useState } from 'react';
import {
  benjaminiHochberg, batchEffectDiagnostic, rmst, limitOfDetection, falseNegativeProb,
  tumorPurity, tmbCalibrate, blissSynergy, hsaSynergy, boinNextDose, conformalInterval,
  reproducibilityHash, oncologyJEV, powerTwoSample, hierarchicalBorrowing, surrogateCorrelation,
  eValue, countClonalTrees, cosineSimilarity, expectedMutations, driverPValue, dropoutRate,
  moransI, replicatorStep, doseVolumeHistogram, identifiabilityScore,
} from '../utils/oncology';

interface Props { modeColor?: string }

export function OncologyLab({ modeColor = '#F0A500' }: Props) {
  const [tab, setTab] = useState('fdr');
  const [out, setOut] = useState('');
  const [jev, setJev] = useState<any>(null);

  const show = (o: any, j?: any) => { setOut(typeof o === 'string' ? o : JSON.stringify(o, null, 2)); if (j) setJev(j); };

  const tabs = [
    { id: 'fdr', label: 'FDR' },
    { id: 'batch', label: 'Batch' },
    { id: 'rmst', label: 'RMST' },
    { id: 'ctdna', label: 'ctDNA' },
    { id: 'purity', label: 'Purity' },
    { id: 'tmb', label: 'TMB' },
    { id: 'synergy', label: 'Synergy' },
    { id: 'boin', label: 'BOIN' },
    { id: 'conformal', label: 'Conformal' },
    { id: 'repro', label: 'Repro' },
    { id: 'power', label: 'Power' },
    { id: 'surrogate', label: 'Surrogate' },
    { id: 'evalue', label: 'E-value' },
    { id: 'clonal', label: 'Clonal' },
    { id: 'signature', label: 'Signature' },
    { id: 'driver', label: 'Driver' },
    { id: 'singlecell', label: 'scRNA' },
    { id: 'spatial', label: 'Spatial' },
    { id: 'ident', label: 'Ident' },
    { id: 'adaptive', label: 'Adaptive' },
    { id: 'radio', label: 'Radio' },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ color: modeColor, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.12em', marginBottom: 12 }}>🎗️ ONCOLOGY ANALYSIS LAB</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? modeColor : 'var(--bg2)', color: tab === t.id ? 'var(--bg1)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'fdr' && <FDRPanel show={show} setJev={setJev} />}
      {tab === 'batch' && <BatchPanel show={show} setJev={setJev} />}
      {tab === 'rmst' && <RMSTPanel show={show} setJev={setJev} />}
      {tab === 'ctdna' && <CtDNAPanel show={show} setJev={setJev} />}
      {tab === 'purity' && <PurityPanel show={show} setJev={setJev} />}
      {tab === 'tmb' && <TMBPanel show={show} setJev={setJev} />}
      {tab === 'synergy' && <SynergyPanel show={show} setJev={setJev} />}
      {tab === 'boin' && <BOINPanel show={show} setJev={setJev} />}
      {tab === 'conformal' && <ConformalPanel show={show} setJev={setJev} />}
      {tab === 'repro' && <ReproPanel show={show} setJev={setJev} />}
      {tab === 'power' && <PowerPanel show={show} setJev={setJev} />}
      {tab === 'surrogate' && <SurrogatePanel show={show} setJev={setJev} />}
      {tab === 'evalue' && <EValuePanel show={show} setJev={setJev} />}
      {tab === 'clonal' && <ClonalPanel show={show} setJev={setJev} />}
      {tab === 'signature' && <SignaturePanel show={show} setJev={setJev} />}
      {tab === 'driver' && <DriverPanel show={show} setJev={setJev} />}
      {tab === 'singlecell' && <SingleCellPanel show={show} setJev={setJev} />}
      {tab === 'spatial' && <SpatialPanel show={show} setJev={setJev} />}
      {tab === 'ident' && <IdentPanel show={show} setJev={setJev} />}
      {tab === 'adaptive' && <AdaptivePanel show={show} setJev={setJev} />}
      {tab === 'radio' && <RadioPanel show={show} setJev={setJev} />}

      {out && <pre style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: 10, fontSize: '0.72rem', color: 'var(--green)', whiteSpace: 'pre-wrap', marginTop: 12, maxHeight: 240, overflowY: 'auto' }}>{out}</pre>}
      {jev && <div style={{ marginTop: 12, padding: 10, background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.65rem' }}>JEV Certainty: {(jev.certainty * 100).toFixed(1)}% — {jev.verdict}</div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>Judgment {(jev.judgment*100).toFixed(0)}% · Evaluation {(jev.evaluation*100).toFixed(0)}% · Verification {(jev.verification*100).toFixed(0)}%</div>
      </div>}
    </div>
  );
}

function FDRPanel({ show, setJev }: any) {
  const [vals, setVals] = useState('0.001, 0.01, 0.03, 0.05, 0.1, 0.2, 0.5');
  const [alpha, setAlpha] = useState('0.05');
  return (
    <div>
      <label style={lbl}>p-values</label>
      <input value={vals} onChange={e => setVals(e.target.value)} style={inp} />
      <label style={lbl}>alpha</label>
      <input value={alpha} onChange={e => setAlpha(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const p = vals.split(',').map(Number); const r = benjaminiHochberg(p, Number(alpha)); show(r); setJev(oncologyJEV(true, true, false, false, 0.6)); }} style={btn('#F0A500')}>RUN BH-FDR</button>
    </div>
  );
}
function BatchPanel({ show, setJev }: any) {
  const [vals, setVals] = useState('1,2,3, 10,11,12');
  const [batches, setBatches] = useState('0,0,0,1,1,1');
  return (
    <div>
      <label style={lbl}>values</label>
      <input value={vals} onChange={e => setVals(e.target.value)} style={inp} />
      <label style={lbl}>batches</label>
      <input value={batches} onChange={e => setBatches(e.target.value)} style={inp} />
      <button onClick={() => { const v = vals.split(',').map(Number); const b = batches.split(',').map(Number); const r = batchEffectDiagnostic(v, b); show(r); setJev(oncologyJEV(true, r.fStat > 0, false, false, 0.5)); }} style={btn('#F0A500')}>CHECK BATCH</button>
    </div>
  );
}
function RMSTPanel({ show, setJev }: any) {
  const [t1, setT1] = useState('1,2,3,4,5');
  const [e1, setE1] = useState('1,1,0,1,0');
  const [t2, setT2] = useState('2,3,4,5,6');
  const [e2, setE2] = useState('1,0,1,1,0');
  const [tau, setTau] = useState('5');
  return (
    <div>
      <label style={lbl}>arm1 times</label><input value={t1} onChange={e => setT1(e.target.value)} style={inp} />
      <label style={lbl}>arm1 events</label><input value={e1} onChange={e => setE1(e.target.value)} style={inp} />
      <label style={lbl}>arm2 times</label><input value={t2} onChange={e => setT2(e.target.value)} style={inp} />
      <label style={lbl}>arm2 events</label><input value={e2} onChange={e => setE2(e.target.value)} style={inp} />
      <label style={lbl}>tau</label><input value={tau} onChange={e => setTau(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const r1 = rmst(t1.split(',').map(Number), e1.split(',').map(Number), Number(tau)); const r2 = rmst(t2.split(',').map(Number), e2.split(',').map(Number), Number(tau)); show({ rmst1: r1, rmst2: r2, difference: r1 - r2 }); setJev(oncologyJEV(true, true, true, false, 0.6)); }} style={btn('#F0A500')}>COMPUTE RMST</button>
    </div>
  );
}
function CtDNAPanel({ show, setJev }: any) {
  const [depth, setDepth] = useState('1000');
  const [vaf, setVaf] = useState('0.001');
  return (
    <div>
      <label style={lbl}>depth</label><input value={depth} onChange={e => setDepth(e.target.value)} style={{ ...inp, width: 80 }} />
      <label style={lbl}>vaf</label><input value={vaf} onChange={e => setVaf(e.target.value)} style={{ ...inp, width: 80 }} />
      <button onClick={() => { const lod = limitOfDetection(Number(depth)); const fn = falseNegativeProb(Number(vaf), Number(depth)); show({ lod, falseNegativeProb: fn }); setJev(oncologyJEV(true, true, false, false, 0.7)); }} style={btn('#F0A500')}>LOD / FN</button>
    </div>
  );
}
function PurityPanel({ show, setJev }: any) {
  const [bulk, setBulk] = useState('5,6,7');
  const [tumor, setTumor] = useState('10,12,14');
  const [normal, setNormal] = useState('1,2,3');
  return (
    <div>
      <label style={lbl}>bulk</label><input value={bulk} onChange={e => setBulk(e.target.value)} style={inp} />
      <label style={lbl}>tumor</label><input value={tumor} onChange={e => setTumor(e.target.value)} style={inp} />
      <label style={lbl}>normal</label><input value={normal} onChange={e => setNormal(e.target.value)} style={inp} />
      <button onClick={() => { const p = tumorPurity(bulk.split(',').map(Number), tumor.split(',').map(Number), normal.split(',').map(Number)); show({ purity: p }); setJev(oncologyJEV(true, true, false, false, 0.5)); }} style={btn('#F0A500')}>DECONVOLVE</button>
    </div>
  );
}
function TMBPanel({ show, setJev }: any) {
  const [panel, setPanel] = useState('10');
  return (
    <div>
      <label style={lbl}>panel TMB</label><input value={panel} onChange={e => setPanel(e.target.value)} style={{ ...inp, width: 80 }} />
      <button onClick={() => { const ex = tmbCalibrate(Number(panel)); show({ panelTmb: Number(panel), exomeTmb: ex }); setJev(oncologyJEV(true, true, false, false, 0.6)); }} style={btn('#F0A500')}>CALIBRATE</button>
    </div>
  );
}
function SynergyPanel({ show, setJev }: any) {
  const [ea, setEa] = useState('0.3');
  const [eb, setEb] = useState('0.4');
  const [eab, setEab] = useState('0.7');
  return (
    <div>
      <label style={lbl}>Ea</label><input value={ea} onChange={e => setEa(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>Eb</label><input value={eb} onChange={e => setEb(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>Eab</label><input value={eab} onChange={e => setEab(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const bliss = blissSynergy(Number(ea), Number(eb), Number(eab)); const hsa = hsaSynergy(Number(ea), Number(eb), Number(eab)); show({ bliss, hsa }); setJev(oncologyJEV(true, true, true, false, 0.6)); }} style={btn('#F0A500')}>SYNERGY</button>
    </div>
  );
}
function BOINPanel({ show, setJev }: any) {
  const [n, setN] = useState('6');
  const [dlt, setDlt] = useState('1');
  return (
    <div>
      <label style={lbl}>n</label><input value={n} onChange={e => setN(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>DLT</label><input value={dlt} onChange={e => setDlt(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const decision = boinNextDose(Number(n), Number(dlt)); show({ decision }); setJev(oncologyJEV(true, true, false, false, 0.5)); }} style={btn('#F0A500')}>NEXT DOSE</button>
    </div>
  );
}
function ConformalPanel({ show, setJev }: any) {
  const [res, setRes] = useState('0.1,-0.2,0.15,-0.1,0.05');
  const [pred, setPred] = useState('5');
  return (
    <div>
      <label style={lbl}>residuals</label><input value={res} onChange={e => setRes(e.target.value)} style={inp} />
      <label style={lbl}>pred</label><input value={pred} onChange={e => setPred(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const r = res.split(',').map(Number); const ci = conformalInterval(r, 0.1); show({ q: ci.q, lower: ci.lower(Number(pred)), upper: ci.upper(Number(pred)) }); setJev(oncologyJEV(true, true, true, false, 0.6)); }} style={btn('#F0A500')}>INTERVAL</button>
    </div>
  );
}
function ReproPanel({ show, setJev }: any) {
  const [inputs, setInputs] = useState('{"seed":42,"version":"1.0"}');
  return (
    <div>
      <label style={lbl}>inputs (JSON)</label>
      <input value={inputs} onChange={e => setInputs(e.target.value)} style={inp} />
      <button onClick={() => { try { const h = reproducibilityHash(JSON.parse(inputs)); show({ hash: h }); setJev(oncologyJEV(true, true, true, true, 0.8)); } catch { show('Invalid JSON'); } }} style={btn('#F0A500')}>HASH</button>
    </div>
  );
}

function PowerPanel({ show, setJev }: any) {
  const [n1, setN1] = useState('10'); const [n2, setN2] = useState('10'); const [delta, setDelta] = useState('1'); const [sigma, setSigma] = useState('1');
  const [means, setMeans] = useState('5,6,7'); const [sizes, setSizes] = useState('10,10,10');
  return (
    <div>
      <label style={lbl}>n1</label><input value={n1} onChange={e => setN1(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>n2</label><input value={n2} onChange={e => setN2(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>delta</label><input value={delta} onChange={e => setDelta(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>sigma</label><input value={sigma} onChange={e => setSigma(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const p = powerTwoSample(Number(n1), Number(n2), Number(delta), Number(sigma)); show({ power: p }); setJev(oncologyJEV(true, true, false, false, 0.6)); }} style={btn('#F0A500')}>POWER</button>
      <div style={{ marginTop: 8 }}>
        <label style={lbl}>group means</label><input value={means} onChange={e => setMeans(e.target.value)} style={inp} />
        <label style={lbl}>group sizes</label><input value={sizes} onChange={e => setSizes(e.target.value)} style={inp} />
        <button onClick={() => { const m = means.split(',').map(Number); const sz = sizes.split(',').map(Number); const r = hierarchicalBorrowing(m, sz); show({ shrunk: r }); setJev(oncologyJEV(true, true, false, false, 0.5)); }} style={btn('#F0A500')}>BORROW</button>
      </div>
    </div>
  );
}
function SurrogatePanel({ show, setJev }: any) {
  const [pfs, setPfs] = useState('3,4,5,6,7');
  const [os, setOs] = useState('6,8,10,12,14');
  return (
    <div>
      <label style={lbl}>trial PFS</label><input value={pfs} onChange={e => setPfs(e.target.value)} style={inp} />
      <label style={lbl}>trial OS</label><input value={os} onChange={e => setOs(e.target.value)} style={inp} />
      <button onClick={() => { const r = surrogateCorrelation(pfs.split(',').map(Number), os.split(',').map(Number)); show(r); setJev(oncologyJEV(true, true, r.r2 > 0.5, false, 0.5)); }} style={btn('#F0A500')}>CORRELATE</button>
    </div>
  );
}
function EValuePanel({ show, setJev }: any) {
  const [rr, setRr] = useState('2.5');
  return (
    <div>
      <label style={lbl}>risk ratio</label><input value={rr} onChange={e => setRr(e.target.value)} style={{ ...inp, width: 80 }} />
      <button onClick={() => { const r = eValue(Number(rr)); show(r); setJev(oncologyJEV(true, true, false, false, 0.6)); }} style={btn('#F0A500')}>E-VALUE</button>
    </div>
  );
}
function ClonalPanel({ show, setJev }: any) {
  const [n, setN] = useState('4');
  return (
    <div>
      <label style={lbl}># clones</label><input value={n} onChange={e => setN(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const c = countClonalTrees(Number(n)); show({ possibleTrees: c }); setJev(oncologyJEV(true, true, false, false, 0.4)); }} style={btn('#F0A500')}>ENUMERATE</button>
    </div>
  );
}
function SignaturePanel({ show, setJev }: any) {
  const [a, setA] = useState('0.1,0.2,0.3,0.4');
  const [b, setB] = useState('0.11,0.19,0.31,0.39');
  return (
    <div>
      <label style={lbl}>sig A</label><input value={a} onChange={e => setA(e.target.value)} style={inp} />
      <label style={lbl}>sig B</label><input value={b} onChange={e => setB(e.target.value)} style={inp} />
      <button onClick={() => { const s = cosineSimilarity(a.split(',').map(Number), b.split(',').map(Number)); show({ cosineSimilarity: s }); setJev(oncologyJEV(true, true, s > 0.9, false, 0.5)); }} style={btn('#F0A500')}>STABILITY</button>
    </div>
  );
}
function DriverPanel({ show, setJev }: any) {
  const [len, setLen] = useState('1000'); const [rate, setRate] = useState('0.001'); const [obs, setObs] = useState('5'); const [factor, setFactor] = useState('1.2');
  return (
    <div>
      <label style={lbl}>length</label><input value={len} onChange={e => setLen(e.target.value)} style={{ ...inp, width: 70 }} />
      <label style={lbl}>rate</label><input value={rate} onChange={e => setRate(e.target.value)} style={{ ...inp, width: 70 }} />
      <label style={lbl}>factor</label><input value={factor} onChange={e => setFactor(e.target.value)} style={{ ...inp, width: 60 }} />
      <label style={lbl}>observed</label><input value={obs} onChange={e => setObs(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const exp = expectedMutations(Number(len), Number(rate), Number(factor)); const p = driverPValue(Number(obs), exp); show({ expected: exp, pValue: p }); setJev(oncologyJEV(true, true, p < 0.05, false, 0.5)); }} style={btn('#F0A500')}>DRIVER</button>
    </div>
  );
}
function SingleCellPanel({ show, setJev }: any) {
  const [counts, setCounts] = useState('0,3,0,5,0,2,4,0');
  return (
    <div>
      <label style={lbl}>counts</label><input value={counts} onChange={e => setCounts(e.target.value)} style={inp} />
      <button onClick={() => { const c = counts.split(',').map(Number); const d = dropoutRate(c); show({ dropoutRate: d, n: c.length }); setJev(oncologyJEV(true, true, false, false, 0.4)); }} style={btn('#F0A500')}>DROPOUT</button>
    </div>
  );
}
function SpatialPanel({ show, setJev }: any) {
  const [vals, setVals] = useState('1,2,3,4');
  const [w, setW] = useState('0,1,0,1;1,0,1,0;0,1,0,1;1,0,1,0');
  return (
    <div>
      <label style={lbl}>values</label><input value={vals} onChange={e => setVals(e.target.value)} style={inp} />
      <label style={lbl}>weights (rows ;)</label><input value={w} onChange={e => setW(e.target.value)} style={inp} />
      <button onClick={() => { const v = vals.split(',').map(Number); const W = w.split(';').map(r => r.split(',').map(Number)); const m = moransI(v, W); show({ moransI: m }); setJev(oncologyJEV(true, true, Math.abs(m) > 0.3, false, 0.5)); }} style={btn('#F0A500')}>MORAN I</button>
    </div>
  );
}
function IdentPanel({ show, setJev }: any) {
  const [jac, setJac] = useState('[[1,0.5],[0.5,1]]');
  return (
    <div>
      <label style={lbl}>jacobian (JSON)</label><input value={jac} onChange={e => setJac(e.target.value)} style={inp} />
      <button onClick={() => { try { const m = JSON.parse(jac); const s = identifiabilityScore(m); show({ identifiability: s }); setJev(oncologyJEV(true, s > 0.1, false, false, 0.4)); } catch { show('Invalid JSON'); } }} style={btn('#F0A500')}>CHECK</button>
    </div>
  );
}
function AdaptivePanel({ show, setJev }: any) {
  const [freqs, setFreqs] = useState('0.5,0.5');
  const [fit, setFit] = useState('1.0,0.8');
  return (
    <div>
      <label style={lbl}>freqs</label><input value={freqs} onChange={e => setFreqs(e.target.value)} style={inp} />
      <label style={lbl}>fitness</label><input value={fit} onChange={e => setFit(e.target.value)} style={inp} />
      <button onClick={() => { const f = freqs.split(',').map(Number); const ft = fit.split(',').map(Number); const r = replicatorStep(f, ft); show({ nextFreqs: r }); setJev(oncologyJEV(true, true, false, false, 0.4)); }} style={btn('#F0A500')}>STEP</button>
    </div>
  );
}
function RadioPanel({ show, setJev }: any) {
  const [doses, setDoses] = useState('10,20,30,40,50');
  const [thresh, setThresh] = useState('30');
  return (
    <div>
      <label style={lbl}>doses</label><input value={doses} onChange={e => setDoses(e.target.value)} style={inp} />
      <label style={lbl}>threshold</label><input value={thresh} onChange={e => setThresh(e.target.value)} style={{ ...inp, width: 60 }} />
      <button onClick={() => { const d = doses.split(',').map(Number); const v = doseVolumeHistogram(d, Number(thresh)); show({ volumeFraction: v }); setJev(oncologyJEV(true, true, false, false, 0.5)); }} style={btn('#F0A500')}>DVH</button>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: '0.62rem', color: 'var(--text-muted)', marginRight: 4, marginLeft: 8 };
const inp: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: '0.72rem', outline: 'none', marginRight: 8 };
function btn(color: string): React.CSSProperties { return { background: color, color: 'var(--bg1)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', marginLeft: 8 }; }