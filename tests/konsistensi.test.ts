import { describe, expect, it } from 'vitest';
import {
  ASUMSI,
  CITY_LIST,
  LIFESTYLE_ITEMS,
  STATUS_LIST,
  WHAT_IF_AWAL,
  buildResult,
  calcMonthly,
  calcPaylater,
  compareWhatIf,
  hitungSimulasi,
  bebanPaylater,
  slipSetoran,
  STATISTIK,
  teksSumber,
  urlKartu,
  type LifestyleId,
  type SimulationInput,
} from '@/lib/simulasi';

/** Skenario reproduksi P0-1: Kerja · Bandar Lampung · Rp 2,5 jt · 3 gaya hidup · HP disobek · Cairkan */
const skenario: SimulationInput = {
  status: 'kerja',
  cityId: 'bandar-lampung',
  age: 24,
  income: 2_500_000,
  lifestyleIds: ['kopi-susu', 'konser', 'hp-baru'],
  tornIds: ['hp-baru'],
  paylaterChoice: 'cairkan',
};

// Matriks: semua status × kota × beberapa gaji × sobekan × pilihan paylater
const gajiUji = [0, 800_000, 2_500_000, 5_000_000, 12_000_000];
const gayaUji: { ambil: LifestyleId[]; sobek: LifestyleId[] }[] = [
  { ambil: [], sobek: [] },
  { ambil: ['kopi-susu', 'nongkrong'], sobek: [] },
  { ambil: ['kopi-susu', 'konser', 'hp-baru'], sobek: ['hp-baru'] },
  { ambil: LIFESTYLE_ITEMS.map((i) => i.id), sobek: ['ojol', 'skincare', 'konser'] },
];
const kasus: SimulationInput[] = [];
for (const st of STATUS_LIST)
  for (const kota of CITY_LIST)
    for (const income of gajiUji)
      for (const g of gayaUji)
        for (const paylaterChoice of ['cairkan', 'tolak', null] as const)
          kasus.push({
            status: st.id,
            cityId: kota.id,
            age: st.umurDefault,
            income,
            lifestyleIds: g.ambil,
            tornIds: g.sobek,
            paylaterChoice,
          });


describe('P0-1: kartu hasil = struk = timeline', () => {
  it('kartu memakai angka struk setelah sobekan (skenario laporan)', () => {
    const struk = calcMonthly(skenario);
    const kartu = buildResult(skenario);
    expect(struk.lifestylePct).toBe(31);
    expect(struk.sisa).toBe(-370_000);
    expect(kartu.lifestylePct).toBe(struk.lifestylePct);
    expect(kartu.sisa).toBe(struk.sisa);
    expect(kartu.sisaPct).toBe(struk.sisaPct);
  });

  it('umur DP rumah di kartu = umur DP rumah di timeline (skenario laporan)', () => {
    const timeline = compareWhatIf(skenario, WHAT_IF_AWAL);
    const kartu = buildResult(skenario);
    expect(kartu.umurDpRumah).toBe(timeline.dasar.umurDpRumah);
  });

  it(`semua scene memakai angka identik (${kasus.length} kombinasi input)`, () => {
    for (const input of kasus) {
      const sim = hitungSimulasi(input);
      const struk = calcMonthly(input); // scene 05
      const timeline = compareWhatIf(input, WHAT_IF_AWAL); // scene 06

      // Struk = sumber tunggal
      expect(sim.bulanan).toEqual(struk);
      // Jalur paylater 05b dihitung dari SISA struk yang sama
      if (input.paylaterChoice === 'cairkan') expect(sim.paylater).toEqual(calcPaylater(struk.sisa));
      else expect(sim.paylater).toBeNull();
      // Kartu = struk
      expect(sim.kartu.sisa).toBe(struk.sisa);
      expect(sim.kartu.sisaPct).toBe(struk.sisaPct);
      expect(sim.kartu.lifestylePct).toBe(struk.lifestylePct);
      expect(sim.kartu.income).toBe(struk.income);
      // Kartu = timeline (proyeksi dasar)
      expect(sim.kartu.umurDpRumah).toBe(timeline.dasar.umurDpRumah);
      expect(sim.kartu.kprDitolak).toBe(timeline.dasar.kprDitolak);
      expect(sim.proyeksiDasar).toEqual(timeline.dasar);
    }
  });

  it('baris yang disobek tidak ikut dijumlah, tapi tetap ada di struk', () => {
    const utuh = calcMonthly({ ...skenario, tornIds: [] });
    const sobek = calcMonthly(skenario);
    const hp = sobek.gayaHidup.baris.find((b) => b.id === 'hp-baru');
    expect(hp?.disobek).toBe(true);
    expect(utuh.gayaHidup.total - sobek.gayaHidup.total).toBe(hp?.nominal);
  });
});

describe('P0-4: slip jalur nabung jujur', () => {
  it('sisa minus → slip kosong, Rp 0', () => {
    const sim = hitungSimulasi({ ...skenario, paylaterChoice: 'tolak' });
    expect(sim.bulanan.sisa).toBeLessThan(0);
    expect(slipSetoran(sim)).toEqual({ kosong: true, setoran: 0 });
  });

  it('sisa plus → setoran = tabungan bulan pertama di timeline', () => {
    const input: SimulationInput = {
      status: 'kerja',
      cityId: 'jakarta',
      age: 24,
      income: 5_000_000,
      lifestyleIds: ['kopi-susu', 'nongkrong'],
      tornIds: [],
      paylaterChoice: 'tolak',
    };
    const sim = hitungSimulasi(input);
    const slip = slipSetoran(sim);
    expect(slip.kosong).toBe(false);
    expect(slip.setoran).toBe(compareWhatIf(input, WHAT_IF_AWAL).dasar.nabungPerBulan);
    expect(slip.setoran).toBeGreaterThan(0);
  });
});

describe('P0-5: timeline tidak saling bertentangan', () => {
  it('sisa minus → milestone 0 "sisa mulai plus" ada, dan semua milestone lain sesudahnya', () => {
    const p = compareWhatIf(skenario, WHAT_IF_AWAL).dasar;
    expect(p.nabungPerBulan).toBeLessThan(0);
    expect(p.umurSisaPlus).not.toBeNull();
    expect(p.umurSisaPlus!).toBeGreaterThan(skenario.age);
    expect(p.milestones[0]).toMatchObject({ id: 'sisa-plus', umur: p.umurSisaPlus });
    for (const m of p.milestones.slice(1)) if (m.umur !== null) expect(m.umur).toBeGreaterThanOrEqual(p.umurSisaPlus!);
  });

  it('sisa plus → tidak ada milestone 0, umurSisaPlus = umur sekarang', () => {
    const input: SimulationInput = { ...skenario, income: 6_000_000, tornIds: [], paylaterChoice: null };
    const p = compareWhatIf(input, WHAT_IF_AWAL).dasar;
    expect(p.umurSisaPlus).toBe(input.age);
    expect(p.milestones.map((m) => m.id)).not.toContain('sisa-plus');
  });

  it('rentang timeline = rentang hitungan (umur 70)', () => {
    expect(ASUMSI.UMUR_AKHIR_TIMELINE).toBe(ASUMSI.UMUR_MAKS_SIMULASI);
    for (const input of kasus) {
      for (const m of compareWhatIf(input, WHAT_IF_AWAL).dasar.milestones)
        if (m.umur !== null) expect(m.umur).toBeLessThanOrEqual(ASUMSI.UMUR_AKHIR_TIMELINE);
    }
  });
});

describe('P1-1: umur dari input dipakai proyeksi', () => {
  it('umur lebih muda → milestone yang sama tercapai di umur berbeda, timeline mulai dari umur input', () => {
    const tua = compareWhatIf({ ...skenario, age: 30 }, WHAT_IF_AWAL).dasar;
    const muda = compareWhatIf({ ...skenario, age: 17 }, WHAT_IF_AWAL).dasar;
    expect(muda.umurSisaPlus!).toBeGreaterThanOrEqual(17);
    expect(muda.umurSisaPlus!).toBeLessThan(tua.umurSisaPlus!);
    expect(muda.umurDpRumah).not.toBe(tua.umurDpRumah);
  });
});

describe('P1-4: URL kartu (prefetch = tampilan) dan privasi nominal', () => {
  it('tanpa toggle: tidak ada nominal rupiah di URL', () => {
    const k = buildResult(skenario);
    const q = new URL(urlKartu(k, false), 'http://x').searchParams;
    expect(q.has('s')).toBe(false);
    expect(q.has('i')).toBe(false);
    expect(q.get('sp')).toBe(String(k.sisaPct));
    expect(q.get('g')).toBe(String(k.lifestylePct));
    expect(q.get('u')).toBe(String(k.umurDpRumah ?? ''));
  });

  it('dengan toggle: nominal ikut, angka sama dengan struk', () => {
    const k = buildResult(skenario);
    const q = new URL(urlKartu(k, true), 'http://x').searchParams;
    expect(q.get('s')).toBe(String(calcMonthly(skenario).sisa));
    expect(q.get('i')).toBe(String(skenario.income));
  });

  it('input sama → URL identik (supaya cache prefetch kena)', () => {
    expect(urlKartu(buildResult(skenario), false)).toBe(urlKartu(buildResult({ ...skenario }), false));
  });
});

describe('P1-7: fakta ketiga personal & sumber jujur', () => {
  it('beban paylater = total kewajiban dibanding gaji user sendiri', () => {
    const b = calcMonthly(skenario);
    const beban = bebanPaylater(b)!;
    expect(beban.totalKewajiban).toBe(calcPaylater(b.sisa).totalKewajiban);
    expect(beban.bulanGaji).toBeCloseTo(beban.totalKewajiban / skenario.income);
    expect(beban.persenTahun).toBe(Math.round((beban.totalKewajiban / (skenario.income * 12)) * 100));
  });

  it('penghasilan 0 → tidak ada perbandingan', () => {
    expect(bebanPaylater(calcMonthly({ ...skenario, income: 0 }))).toBeNull();
  });

  it('periode sumber tidak pernah ditebak: kosong = tertulis belum diverifikasi', () => {
    for (const st of STATISTIK) {
      expect(st.url.startsWith('https://')).toBe(true);
      if (st.periode === null) expect(teksSumber(st)).toContain('periode belum diverifikasi');
    }
  });
});
