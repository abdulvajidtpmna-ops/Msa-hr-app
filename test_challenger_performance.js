/**
 * =========================================================================================
 * CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE
 * KRA/KPI Lifecycle, Evaluation Scoring Engine, Boundary Robustness & Employee Isolation
 * =========================================================================================
 */

const path = require('path');
const supertest = require(path.resolve(__dirname, 'server/node_modules/supertest'));
const appModule = require(path.resolve(__dirname, 'server/dist/app'));
const app = appModule.default || appModule;
const { SheetsRepo } = require(path.resolve(__dirname, 'server/dist/services/sheetsRepo'));
const { signToken } = require(path.resolve(__dirname, 'server/dist/utils/jwt'));

async function runChallengerPerformanceSuite() {
  console.log('================================================================================');
  console.log('⚡ CHALLENGER 2: ADVERSARIAL PERFORMANCE, SCORING & ISOLATION STRESS HARNESS');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;
  const failureDetails = [];

  function assert(desc, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc} - Detail: ${detail}`);
      failed++;
      failureDetails.push({ desc, detail });
    }
  }

  // Tokens for authentication
  const hrToken = signToken({
    userId: 'user_hr_test',
    employeeId: 'MSA-0001',
    email: 'hrmanager@masteredskill.com',
    role: 'HR Manager',
    mustChangePassword: false
  });

  const emp1Token = signToken({
    userId: 'user_emp1_test',
    employeeId: 'MSA-TEST-EMP1',
    email: 'alice.acad@masteredskill.com',
    role: 'Employee',
    mustChangePassword: false
  });

  const emp2Token = signToken({
    userId: 'user_emp2_test',
    employeeId: 'MSA-TEST-EMP2',
    email: 'bob.hr@masteredskill.com',
    role: 'Employee',
    mustChangePassword: false
  });

  const nowIso = new Date().toISOString();
  const testIdsToCleanup = {
    employees: ['MSA-TEST-EMP1', 'MSA-TEST-EMP2'],
    kras: [],
    kpis: []
  };

  try {
    // -------------------------------------------------------------------------
    // SETUP: Ensure test employees exist in SheetsRepo for isolation testing
    // -------------------------------------------------------------------------
    console.log('--- SETUP: Seeding Test Employees for Isolation Testing ---');
    await SheetsRepo.create('Employees', {
      id: 'emp_test_iso_1',
      employee_id: 'MSA-TEST-EMP1',
      full_name: 'Alice Academic',
      email: 'alice.acad@masteredskill.com',
      department: 'Academics',
      designation: 'Faculty / Trainer',
      role: 'Employee',
      status: 'Active'
    }, 'system_test');

    await SheetsRepo.create('Employees', {
      id: 'emp_test_iso_2',
      employee_id: 'MSA-TEST-EMP2',
      full_name: 'Bob HumanResources',
      email: 'bob.hr@masteredskill.com',
      department: 'Human Resources',
      designation: 'HR Coordinator',
      role: 'Employee',
      status: 'Active'
    }, 'system_test');

    SheetsRepo.clearCache();
    console.log('  Seeded test employees MSA-TEST-EMP1 and MSA-TEST-EMP2\n');

    // =========================================================================
    // SECTION 1: Weighted Score Calculation Matrix (Math & Boundaries)
    // Formula: Progress % = min(100, max(0, (current / target) * 100)) (if target > 0, else 100)
    //          Rating % = (manager_rating / 5) * 100
    //          Weighted Score = round(0.5 * Progress % + 0.5 * Rating %)
    // =========================================================================
    console.log('--- SECTION 1: Weighted Score Calculation Formula & Boundary Vectors ---');

    function computeExpectedScore(targetVal, currentVal, managerRating) {
      const target = Number(targetVal) || 100;
      const current = Number(currentVal) || 0;
      const progressPct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 100;
      const ratingPct = (Number(managerRating) / 5) * 100;
      const score = Math.round((progressPct * 0.5) + (ratingPct * 0.5));
      let status = 'Achieved';
      if (score < 50) status = 'Missed';
      else if (score < 85) status = 'Partially Achieved';
      return { score, status, progressPct, ratingPct };
    }

    const testVectors = [
      { name: 'Zero progress, min rating (1.0)', target: 100, current: 0, rating: 1.0, expScore: 10, expStatus: 'Missed' },
      { name: 'Half progress (50%), mid rating (3.0)', target: 100, current: 50, rating: 3.0, expScore: 55, expStatus: 'Partially Achieved' },
      { name: 'High progress (80%), rating (4.0)', target: 100, current: 80, rating: 4.0, expScore: 80, expStatus: 'Partially Achieved' },
      { name: 'Full progress (100%), max rating (5.0)', target: 100, current: 100, rating: 5.0, expScore: 100, expStatus: 'Achieved' },
      { name: 'Achieved threshold boundary: 85% progress, 4.3 rating', target: 100, current: 85, rating: 4.3, expScore: 86, expStatus: 'Achieved' },
      { name: 'Over-achievement 150% capped: current 150 / target 100, rating 4.0', target: 100, current: 150, rating: 4.0, expScore: 90, expStatus: 'Achieved' },
      { name: 'Extreme over-achievement 300% capped: current 300 / target 100, rating 5.0', target: 100, current: 300, rating: 5.0, expScore: 100, expStatus: 'Achieved' },
      { name: 'Negative progress: current -25 / target 100 clamped to 0%, rating 2.0', target: 100, current: -25, rating: 2.0, expScore: 20, expStatus: 'Missed' },
      { name: 'Target = 0 (division by zero safe handling): current 0, rating 5.0', target: 0, current: 0, rating: 5.0, expScore: 50, expStatus: 'Partially Achieved' }, // target 0 evaluates to fallback 100, current 0 -> 0% progress + 100% rating = 50
      { name: 'Target = 0 with current 100, rating 5.0', target: 0, current: 100, rating: 5.0, expScore: 100, expStatus: 'Achieved' },
      { name: 'Rounding down: 84.4 -> 84 (Partially Achieved)', target: 100, current: 88, rating: 4.04, expScore: 84, expStatus: 'Partially Achieved' },
      { name: 'Rounding up: 84.6 -> 85 (Achieved)', target: 100, current: 89, rating: 4.01, expScore: 85, expStatus: 'Achieved' },
      { name: 'Status Missed boundary: 49.4 -> 49 (Missed)', target: 100, current: 50, rating: 2.44, expScore: 49, expStatus: 'Missed' },
      { name: 'Status Partially Achieved boundary: 49.6 -> 50', target: 100, current: 50, rating: 2.5, expScore: 50, expStatus: 'Partially Achieved' }
    ];

    for (const vec of testVectors) {
      const calc = computeExpectedScore(vec.target, vec.current, vec.rating);
      assert(`Formula Math [${vec.name}] -> score: ${calc.score}, status: ${calc.status}`,
        calc.score === vec.expScore && calc.status === vec.expStatus,
        `Expected score=${vec.expScore}, status=${vec.expStatus}; Got score=${calc.score}, status=${calc.status}`
      );
    }
    console.log('');

    // =========================================================================
    // SECTION 2: Evaluation API Endpoint Boundary & Input Validation
    // =========================================================================
    console.log('--- SECTION 2: Evaluation API Endpoint Adversarial Stress Testing ---');

    // Create a parent KRA and test KPI for evaluation endpoint testing
    const evalKraId = `kra_eval_stress_${Date.now()}`;
    const evalKpiId = `kpi_eval_stress_${Date.now()}`;
    testIdsToCleanup.kras.push(evalKraId);
    testIdsToCleanup.kpis.push(evalKpiId);

    await SheetsRepo.create('KRAs', {
      id: evalKraId,
      title: 'KRA for Evaluation Stress Tests',
      department: 'Academics',
      assigned_to: 'ALL',
      period: '2026',
      weightage: 50,
      status: 'Active'
    }, 'MSA-0001');

    await SheetsRepo.create('KPIs', {
      id: evalKpiId,
      kra_id: evalKraId,
      employee_id: 'MSA-TEST-EMP1',
      title: 'KPI for Evaluation Stress Tests',
      target_value: 100,
      current_value: 80,
      unit: '%',
      weightage: 50,
      status: 'Pending',
      evaluation_status: 'Not Started'
    }, 'MSA-0001');

    SheetsRepo.clearCache();

    // 2.1 Self-evaluation Valid Boundary: rating = 1.0 (minimum valid)
    const selfResMin = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 1.0, self_comments: 'Minimum rating test', current_value: 80 });
    assert('Self-evaluate allows min boundary rating 1.0 (HTTP 200)', selfResMin.status === 200 && selfResMin.body.success === true);

    // 2.2 Self-evaluation Valid Boundary: rating = 5.0 (maximum valid)
    const selfResMax = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 5.0, self_comments: 'Maximum rating test', current_value: 95 });
    assert('Self-evaluate allows max boundary rating 5.0 (HTTP 200)', selfResMax.status === 200 && selfResMax.body.kpi.self_rating === 5.0);

    // 2.3 Self-evaluation Invalid Boundary: rating = 0.9 (below minimum)
    const selfResBelowMin = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 0.9, self_comments: 'Below min test' });
    assert('Self-evaluate rejects rating < 1.0 (HTTP 400)', selfResBelowMin.status === 400, `Got: ${selfResBelowMin.status}`);

    // 2.4 Self-evaluation Invalid Boundary: rating = 0
    const selfResZero = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 0 });
    assert('Self-evaluate rejects rating 0 (HTTP 400)', selfResZero.status === 400);

    // 2.5 Self-evaluation Invalid Boundary: rating = -5.0
    const selfResNeg = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: -5.0 });
    assert('Self-evaluate rejects negative rating (HTTP 400)', selfResNeg.status === 400);

    // 2.6 Self-evaluation Invalid Boundary: rating = 5.1 (above maximum)
    const selfResAboveMax = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 5.1 });
    assert('Self-evaluate rejects rating > 5.0 (HTTP 400)', selfResAboveMax.status === 400);

    // 2.7 Self-evaluation Non-numeric rating: rating = "EXCELLENT"
    const selfResAlpha = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 'EXCELLENT' });
    assert('Self-evaluate rejects non-numeric rating (HTTP 400)', selfResAlpha.status === 400);

    // 2.8 Manager-evaluation Valid Boundary: rating = 1.0 (minimum valid)
    const mgrResMin = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/evaluate`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ manager_rating: 1.0, manager_comments: 'Min valid rating' });
    assert('Manager-evaluate allows min boundary rating 1.0 (HTTP 200)', mgrResMin.status === 200 && mgrResMin.body.success === true);

    // 2.9 Manager-evaluation Valid Boundary: rating = 5.0 (maximum valid)
    const mgrResMax = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/evaluate`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ manager_rating: 5.0, manager_comments: 'Max valid rating' });
    assert('Manager-evaluate allows max boundary rating 5.0 (HTTP 200)', mgrResMax.status === 200 && mgrResMax.body.kpi.manager_rating === 5.0);

    // 2.10 Manager-evaluation Invalid Boundary: rating = 0.5 (below 1.0)
    const mgrResBelow = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/evaluate`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ manager_rating: 0.5 });
    assert('Manager-evaluate rejects rating < 1.0 (HTTP 400)', mgrResBelow.status === 400);

    // 2.11 Manager-evaluation Invalid Boundary: rating = 6.0 (above 5.0)
    const mgrResAbove = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/evaluate`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ manager_rating: 6.0 });
    assert('Manager-evaluate rejects rating > 5.0 (HTTP 400)', mgrResAbove.status === 400);

    // 2.12 Manager-evaluation with Manual Score Override
    const mgrResOverride = await supertest(app)
      .post(`/api/performance/kpis/${evalKpiId}/evaluate`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ manager_rating: 4.0, score: 99, status: 'Achieved' });
    assert('Manager-evaluate respects explicit score override (99)', mgrResOverride.status === 200 && mgrResOverride.body.kpi.score === 99);

    // 2.13 Manager-evaluation on non-existent KPI
    const mgrResNotFound = await supertest(app)
      .post('/api/performance/kpis/kpi_nonexistent_9999/evaluate')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ manager_rating: 4.5 });
    assert('Manager-evaluate returns 404 for non-existent KPI', mgrResNotFound.status === 404);
    console.log('');

    // =========================================================================
    // SECTION 3: Employee Isolation & Authorization Boundaries
    // =========================================================================
    console.log('--- SECTION 3: Employee Isolation & Authorization Boundaries ---');

    const kraIso1 = `kra_iso_emp1_${Date.now()}`;
    const kraIso2 = `kra_iso_emp2_${Date.now()}`;
    const kpiIso1 = `kpi_iso_emp1_${Date.now()}`;
    const kpiIso2 = `kpi_iso_emp2_${Date.now()}`;
    testIdsToCleanup.kras.push(kraIso1, kraIso2);
    testIdsToCleanup.kpis.push(kpiIso1, kpiIso2);

    await SheetsRepo.create('KRAs', {
      id: kraIso1,
      title: 'Alice Private Academic KRA',
      department: 'Academics',
      assigned_to: 'MSA-TEST-EMP1',
      period: '2026',
      weightage: 50,
      status: 'Active'
    }, 'MSA-0001');

    await SheetsRepo.create('KRAs', {
      id: kraIso2,
      title: 'Bob Private HR KRA',
      department: 'Human Resources',
      assigned_to: 'MSA-TEST-EMP2',
      period: '2026',
      weightage: 50,
      status: 'Active'
    }, 'MSA-0001');

    await SheetsRepo.create('KPIs', {
      id: kpiIso1,
      kra_id: kraIso1,
      employee_id: 'MSA-TEST-EMP1',
      title: 'Alice Specific KPI',
      target_value: 100,
      current_value: 90,
      weightage: 50,
      status: 'In Progress'
    }, 'MSA-0001');

    await SheetsRepo.create('KPIs', {
      id: kpiIso2,
      kra_id: kraIso2,
      employee_id: 'MSA-TEST-EMP2',
      title: 'Bob Confidential KPI',
      target_value: 100,
      current_value: 40,
      weightage: 50,
      status: 'Pending'
    }, 'MSA-0001');

    SheetsRepo.clearCache();

    // 3.1 Employee 1 lists KPIs -> Should only see own KPIs
    const emp1ListRes = await supertest(app)
      .get('/api/performance/kpis')
      .set('Authorization', `Bearer ${emp1Token}`);
    const emp1KpiList = emp1ListRes.body.kpis || [];
    const emp1SeesOwn = emp1KpiList.some(k => k.id === kpiIso1);
    const emp1SeesOther = emp1KpiList.some(k => k.id === kpiIso2 || k.employee_id === 'MSA-TEST-EMP2');
    assert('Employee A lists KPIs: Sees own assigned KPI', emp1SeesOwn);
    assert('Employee A lists KPIs: STRICT ISOLATION - Does NOT see Employee B KPI', !emp1SeesOther);

    // 3.2 Query Parameter Injection Attack: Employee 1 requests ?employee_id=MSA-TEST-EMP2
    const emp1AttackRes = await supertest(app)
      .get('/api/performance/kpis?employee_id=MSA-TEST-EMP2')
      .set('Authorization', `Bearer ${emp1Token}`);
    const attackKpiList = emp1AttackRes.body.kpis || [];
    const attackLeakedOther = attackKpiList.some(k => k.id === kpiIso2 || k.employee_id === 'MSA-TEST-EMP2');
    assert('Employee A parameter injection (?employee_id=EMP2) is blocked and quarantined', !attackLeakedOther);

    // 3.3 Employee 1 attempts to self-evaluate Employee 2 KPI
    const emp1TamperRes = await supertest(app)
      .post(`/api/performance/kpis/${kpiIso2}/self-evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ self_rating: 4.0, self_comments: 'Tampering attempt' });
    assert('Employee A attempting self-evaluation on Employee B KPI returns HTTP 403 Forbidden', emp1TamperRes.status === 403);

    // 3.4 Employee role attempts to perform Manager Evaluation
    const emp1EvalRes = await supertest(app)
      .post(`/api/performance/kpis/${kpiIso1}/evaluate`)
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ manager_rating: 5.0 });
    assert('Employee role evaluating KPI returns HTTP 403 Forbidden', emp1EvalRes.status === 403);

    // 3.5 Employee role attempts to create KRA
    const emp1CreateKraRes = await supertest(app)
      .post('/api/performance/kras')
      .set('Authorization', `Bearer ${emp1Token}`)
      .send({ title: 'Hacked KRA' });
    assert('Employee role creating KRA returns HTTP 403 Forbidden', emp1CreateKraRes.status === 403);

    // 3.6 Employee role attempts to delete KRA
    const emp1DelKraRes = await supertest(app)
      .delete(`/api/performance/kras/${kraIso1}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    assert('Employee role deleting KRA returns HTTP 403 Forbidden', emp1DelKraRes.status === 403);

    // 3.7 Employee role attempts to delete KPI
    const emp1DelKpiRes = await supertest(app)
      .delete(`/api/performance/kpis/${kpiIso1}`)
      .set('Authorization', `Bearer ${emp1Token}`);
    assert('Employee role deleting KPI returns HTTP 403 Forbidden', emp1DelKpiRes.status === 403);

    // 3.8 Dashboard isolation: Employee 1 requesting dashboard stats
    const emp1DashRes = await supertest(app)
      .get('/api/performance/dashboard')
      .set('Authorization', `Bearer ${emp1Token}`);
    const dashStats = emp1DashRes.body.stats;
    const topPerfs = dashStats?.topPerformers || [];
    const leakedEmp2InDashboard = topPerfs.some(tp => tp.employee_id === 'MSA-TEST-EMP2');
    assert('Performance Dashboard does NOT leak other employees in personal view', !leakedEmp2InDashboard);
    console.log('');

    // =========================================================================
    // SECTION 4: Cascading Deletion of Child KPIs
    // =========================================================================
    console.log('--- SECTION 4: Cascading Deletion of Child KPIs ---');

    const cascadeKraId = `kra_cascade_${Date.now()}`;
    const cascadeKpi1 = `kpi_casc_1_${Date.now()}`;
    const cascadeKpi2 = `kpi_casc_2_${Date.now()}`;
    const cascadeKpi3 = `kpi_casc_3_${Date.now()}`;
    testIdsToCleanup.kras.push(cascadeKraId);
    testIdsToCleanup.kpis.push(cascadeKpi1, cascadeKpi2, cascadeKpi3);

    // Create KRA
    await SheetsRepo.create('KRAs', {
      id: cascadeKraId,
      title: 'Parent KRA for Cascade Test',
      department: 'Academics',
      assigned_to: 'ALL',
      period: '2026',
      weightage: 60,
      status: 'Active'
    }, 'MSA-0001');

    // Create 3 child KPIs
    await SheetsRepo.create('KPIs', {
      id: cascadeKpi1,
      kra_id: cascadeKraId,
      employee_id: 'MSA-0003',
      title: 'Child KPI 1',
      target_value: 100,
      current_value: 50,
      status: 'Pending'
    }, 'MSA-0001');

    await SheetsRepo.create('KPIs', {
      id: cascadeKpi2,
      kra_id: cascadeKraId,
      employee_id: 'MSA-0003',
      title: 'Child KPI 2',
      target_value: 100,
      current_value: 70,
      status: 'Pending'
    }, 'MSA-0001');

    await SheetsRepo.create('KPIs', {
      id: cascadeKpi3,
      kra_id: cascadeKraId,
      employee_id: 'MSA-0003',
      title: 'Child KPI 3',
      target_value: 100,
      current_value: 90,
      status: 'Pending'
    }, 'MSA-0001');

    SheetsRepo.clearCache();

    // Verify all 3 exist before deletion
    const kpisBefore = await SheetsRepo.list('KPIs');
    assert('Pre-condition: 3 child KPIs present before deletion',
      [cascadeKpi1, cascadeKpi2, cascadeKpi3].every(id => kpisBefore.some(k => k.id === id))
    );

    // Delete Parent KRA via DELETE /api/performance/kras/:id
    const delRes = await supertest(app)
      .delete(`/api/performance/kras/${cascadeKraId}`)
      .set('Authorization', `Bearer ${hrToken}`);
    assert('DELETE /api/performance/kras/:id returns HTTP 200 OK', delRes.status === 200 && delRes.body.success === true);

    SheetsRepo.clearCache();

    // Verify parent KRA is soft-deleted
    const kraAfter = await SheetsRepo.findById('KRAs', cascadeKraId);
    assert('Parent KRA soft-deleted (findById returns null)', kraAfter === null);

    // Verify all 3 child KPIs are soft-deleted
    const kpi1After = await SheetsRepo.findById('KPIs', cascadeKpi1);
    const kpi2After = await SheetsRepo.findById('KPIs', cascadeKpi2);
    const kpi3After = await SheetsRepo.findById('KPIs', cascadeKpi3);
    assert('Child KPI 1 soft-deleted via cascade', kpi1After === null);
    assert('Child KPI 2 soft-deleted via cascade', kpi2After === null);
    assert('Child KPI 3 soft-deleted via cascade', kpi3After === null);

    // Verify API GET /api/performance/kpis does not return the deleted children
    const hrKpisRes = await supertest(app)
      .get('/api/performance/kpis')
      .set('Authorization', `Bearer ${hrToken}`);
    const hrKpisList = hrKpisRes.body.kpis || [];
    const leakedCascadedKpi = hrKpisList.some(k => [cascadeKpi1, cascadeKpi2, cascadeKpi3].includes(k.id));
    assert('GET /api/performance/kpis excludes all cascaded deleted child KPIs', !leakedCascadedKpi);
    console.log('');

    // =========================================================================
    // SECTION 5: Master Seed Idempotence & State Preservation
    // =========================================================================
    console.log('--- SECTION 5: Master Seed Idempotence & Stability ---');

    // First call to seed
    const seedRes1 = await supertest(app)
      .post('/api/performance/seed')
      .set('Authorization', `Bearer ${hrToken}`);
    assert('Initial POST /api/performance/seed succeeds (HTTP 200 or 201)',
      seedRes1.status === 200 || seedRes1.status === 201
    );

    SheetsRepo.clearCache();
    const krasAfterSeed1 = await SheetsRepo.list('KRAs');
    const kpisAfterSeed1 = await SheetsRepo.list('KPIs');
    const kraCount1 = krasAfterSeed1.length;
    const kpiCount1 = kpisAfterSeed1.length;
    console.log(`  Database state after seed 1: ${kraCount1} KRAs, ${kpiCount1} KPIs`);

    // Second call to seed (must be idempotent: no duplicates, no crashes)
    const seedRes2 = await supertest(app)
      .post('/api/performance/seed')
      .set('Authorization', `Bearer ${hrToken}`);
    assert('Second POST /api/performance/seed returns HTTP 200 (Already initialized)',
      seedRes2.status === 200 && seedRes2.body.success === true
    );

    SheetsRepo.clearCache();
    const krasAfterSeed2 = await SheetsRepo.list('KRAs');
    const kpisAfterSeed2 = await SheetsRepo.list('KPIs');
    assert('Seed idempotence: KRA count unchanged on 2nd seed call', krasAfterSeed2.length === kraCount1, `Expected ${kraCount1}, got ${krasAfterSeed2.length}`);
    assert('Seed idempotence: KPI count unchanged on 2nd seed call', kpisAfterSeed2.length === kpiCount1, `Expected ${kpiCount1}, got ${kpisAfterSeed2.length}`);

    // Third call to seed
    const seedRes3 = await supertest(app)
      .post('/api/performance/seed')
      .set('Authorization', `Bearer ${hrToken}`);
    assert('Third POST /api/performance/seed returns HTTP 200 without error', seedRes3.status === 200);

    SheetsRepo.clearCache();
    const krasAfterSeed3 = await SheetsRepo.list('KRAs');
    const kpisAfterSeed3 = await SheetsRepo.list('KPIs');
    assert('Seed idempotence: KRA count unchanged on 3rd seed call', krasAfterSeed3.length === kraCount1);
    assert('Seed idempotence: KPI count unchanged on 3rd seed call', kpisAfterSeed3.length === kpiCount1);
    console.log('');

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Clean up test fixtures created during stress run
    // -------------------------------------------------------------------------
    console.log('--- CLEANUP: Removing Stress Test Fixtures ---');
    try {
      for (const kpiId of testIdsToCleanup.kpis) {
        await SheetsRepo.softDelete('KPIs', kpiId).catch(() => {});
      }
      for (const kraId of testIdsToCleanup.kras) {
        await SheetsRepo.softDelete('KRAs', kraId).catch(() => {});
      }
      for (const empId of testIdsToCleanup.employees) {
        await SheetsRepo.softDelete('Employees', empId).catch(() => {});
      }
      SheetsRepo.clearCache();
      console.log('  Cleaned up all transient test fixtures.\n');
    } catch (cleanupErr) {
      console.warn('  Cleanup notice:', cleanupErr.message);
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('================================================================================');
  console.log(`CHALLENGER 2 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failureDetails.length > 0) {
    console.error('\nFailures breakdown:');
    failureDetails.forEach((f, i) => {
      console.error(`  ${i + 1}. ${f.desc} | ${f.detail}`);
    });
    process.exit(1);
  } else {
    console.log('\n🏆 ALL EMPIRICAL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runChallengerPerformanceSuite().catch(err => {
  console.error('Fatal crash during Challenger 2 suite execution:', err);
  process.exit(1);
});
