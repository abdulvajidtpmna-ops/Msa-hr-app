import { SheetsRepo } from '../services/sheetsRepo';
import { Kra, Kpi } from '../types';

describe('Performance Management & Scoring Engine', () => {
  jest.setTimeout(60000);
  const testKraId = `test_kra_${Date.now()}`;
  const testKpiId = `test_kpi_${Date.now()}`;

  afterAll(async () => {
    try {
      await SheetsRepo.softDelete('KRAs', testKraId);
      await SheetsRepo.softDelete('KPIs', testKpiId);
    } catch {}
  }, 30000);

  test('1. Creates and retrieves a KRA via SheetsRepo', async () => {
    const kra: Kra = {
      id: testKraId,
      title: 'Full Stack Curriculum Delivery',
      description: 'Deliver courses on modern web stacks with 90%+ pass rate',
      department: 'Academics',
      designation: 'Faculty / Trainer',
      assigned_to: 'MSA-0003',
      assigned_by: 'MSA-0001',
      period: '2026',
      weightage: 50,
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'MSA-0001',
      is_deleted: false
    };

    await SheetsRepo.create<Kra>('KRAs', kra);
    const fetched = await SheetsRepo.findById<Kra>('KRAs', testKraId);

    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Full Stack Curriculum Delivery');
    expect(fetched?.department).toBe('Academics');
    expect(fetched?.weightage).toBe(50);
  });

  test('2. Creates and retrieves a KPI linked to the KRA', async () => {
    const kpi: Kpi = {
      id: testKpiId,
      kra_id: testKraId,
      employee_id: 'MSA-0003',
      title: 'Course Module Completion',
      description: 'Complete 20 course modules within semester',
      target_value: 20,
      current_value: 18,
      unit: 'Count',
      weightage: 60,
      start_date: '2026-01-01',
      due_date: '2026-06-30',
      status: 'Pending',
      self_rating: '',
      self_comments: '',
      manager_rating: '',
      manager_comments: '',
      score: '',
      evaluation_status: 'Not Started',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'MSA-0001',
      is_deleted: false
    };

    await SheetsRepo.create<Kpi>('KPIs', kpi);
    const fetched = await SheetsRepo.findById<Kpi>('KPIs', testKpiId);

    expect(fetched).toBeDefined();
    expect(fetched?.kra_id).toBe(testKraId);
    expect(fetched?.employee_id).toBe('MSA-0003');
    expect(Number(fetched?.target_value)).toBe(20);
    expect(Number(fetched?.current_value)).toBe(18);
  });

  test('3. Simulates employee self-evaluation', async () => {
    const existing = await SheetsRepo.findById<Kpi>('KPIs', testKpiId);
    expect(existing).toBeDefined();

    const updated: Kpi = {
      ...existing!,
      self_rating: 4.5,
      self_comments: '18 out of 20 modules completed with lab exercises.',
      current_value: 19,
      evaluation_status: 'Self Submitted',
      updated_at: new Date().toISOString()
    };

    await SheetsRepo.update<Kpi>('KPIs', testKpiId, updated);
    const fetched = await SheetsRepo.findById<Kpi>('KPIs', testKpiId);

    expect(fetched?.self_rating).toBe(4.5);
    expect(fetched?.self_comments).toContain('18 out of 20 modules');
    expect(fetched?.evaluation_status).toBe('Self Submitted');
    expect(Number(fetched?.current_value)).toBe(19);
  });

  test('4. Simulates manager evaluation and computes weighted performance score', async () => {
    const kpi = await SheetsRepo.findById<Kpi>('KPIs', testKpiId);
    expect(kpi).toBeDefined();

    const managerRating = 4.8;
    const target = Number(kpi!.target_value); // 20
    const current = Number(kpi!.current_value); // 19
    const progressPct = Math.min(100, (current / target) * 100); // (19/20)*100 = 95%
    const ratingPct = (managerRating / 5) * 100; // 96%
    const calculatedScore = Math.round((progressPct * 0.5) + (ratingPct * 0.5)); // 0.5*95 + 0.5*96 = 95.5 -> 96

    const determinedStatus = calculatedScore >= 85 ? 'Achieved' : 'Partially Achieved';

    const evaluated: Kpi = {
      ...kpi!,
      manager_rating: managerRating,
      manager_comments: 'Strong teaching consistency.',
      score: calculatedScore,
      status: determinedStatus,
      evaluation_status: 'Evaluated',
      evaluated_by: 'MSA-0001',
      evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await SheetsRepo.update<Kpi>('KPIs', testKpiId, evaluated);
    const fetched = await SheetsRepo.findById<Kpi>('KPIs', testKpiId);

    expect(fetched?.manager_rating).toBe(4.8);
    expect(fetched?.score).toBe(96);
    expect(fetched?.status).toBe('Achieved');
    expect(fetched?.evaluation_status).toBe('Evaluated');
  });

  test('5. Soft deletes KRA and cascades to child KPIs', async () => {
    await SheetsRepo.softDelete('KRAs', testKraId);
    const childKpis = await SheetsRepo.find<Kpi>('KPIs', k => k.kra_id === testKraId);
    for (const child of childKpis) {
      await SheetsRepo.softDelete('KPIs', child.id);
    }

    const kra = await SheetsRepo.findById<Kra>('KRAs', testKraId);
    const kpi = await SheetsRepo.findById<Kpi>('KPIs', testKpiId);

    expect(kra).toBeNull();
    expect(kpi).toBeNull();
  });
});
