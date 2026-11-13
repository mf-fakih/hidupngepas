import { expect, test, type Page } from '@playwright/test';

/**
 * Alur utama Hidup Ngepas, diklik lewat UI sungguhan (tanpa menyuntik state ke store).
 * Angka yang diharapkan (DP umur 57, gaya hidup 31%, sisa -15%) sudah dicek manual
 * di build produksi untuk profil: Kerja · Bandar Lampung · Rp 2.500.000.
 */

/** Judul kartu (awalan) yang di-"Gue banget"-kan; sisanya di-skip */
const DITERIMA = ['Kopi susu', 'Nonton konser', 'HP baru'];

const tombol = (page: Page, nama: string | RegExp) =>
  page.getByRole('button', { name: nama, exact: typeof nama === 'string' ? true : undefined });

async function tungguScene(page: Page, hash: string) {
  await expect(page).toHaveURL(new RegExp(`#${hash}$`));
  // Crossfade (AnimatePresence popLayout): scene lama masih di DOM sampai selesai memudar,
  // dan tombolnya bisa bernama sama ("Lanjut"). Tunggu sampai tinggal satu scene.
  await expect(page.locator('main > div')).toHaveCount(1);
}

/** Hero → profil → gaji → swipe → struk (sobek cicilan HP) → modal paylater */
async function sampaiModalPaylater(page: Page) {
  await page.goto('/');

  // 01 — Hero (tombol bisa tertutup preloader sebentar; klik menunggu sampai bisa)
  await tombol(page, 'Cek Hidup Gue').click();
  await tungguScene(page, 'profil');

  // 02 — Status & kota
  await page.getByRole('radio', { name: 'Kerja', exact: true }).click();
  await page.getByRole('radio', { name: 'Bandar Lampung', exact: true }).click();
  await tombol(page, 'Lanjut').click();
  await tungguScene(page, 'gaji');

  // 03 — Gaji
  const gaji = page.locator('#input-gaji');
  await gaji.fill('2500000');
  await expect(gaji).toHaveValue('2.500.000');
  await tombol(page, 'Lanjut').click();
  await tungguScene(page, 'gaya-hidup');

  // 04 — Swipe: baca judul kartu yang tampil TEPAT sebelum klik
  const cetak = tombol(page, 'Cetak struk gue');
  const gueBanget = tombol(page, 'Gue banget');
  const judulKartu = page.locator('[data-kursor=GESER] h3');
  for (let i = 0; i < 20 && !(await cetak.isVisible()); i++) {
    // Tombol dikunci selama kartu terbang
    await expect(gueBanget).toBeEnabled();
    const judul = (await judulKartu.textContent())?.trim() ?? '';
    const terima = DITERIMA.some((awalan) => judul.startsWith(awalan));
    await (terima ? gueBanget : tombol(page, 'Skip')).click();
    // Tunggu kartu berganti (atau tumpukan habis) sebelum membaca judul berikutnya
    await expect
      .poll(async () => (await cetak.isVisible()) || ((await judulKartu.textContent())?.trim() ?? '') !== judul)
      .toBe(true);
  }
  await expect(page.getByText(`${DITERIMA.length} dari 8 lo banget.`)).toBeVisible();
  await cetak.click();
  await tungguScene(page, 'struk');

  // 05 — Struk: sobek cicilan HP, struk tetap minus
  const sobekHp = tombol(page, 'Sobek CICILAN HP BARU');
  await sobekHp.click();
  await expect(page.getByRole('button', { name: 'Tempel lagi CICILAN HP BARU' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await tombol(page, 'Terus gimana dong?').click();
  await tungguScene(page, 'cairkan');
}

test('Cairkan paylater: kartu hasil & timeline memakai angka yang sama', async ({ page }) => {
  await sampaiModalPaylater(page);

  // 05a → 05b
  await tombol(page, 'Cairkan').click();
  await tungguScene(page, 'paylater');
  const lewati = tombol(page, 'Lewati');
  if (await lewati.isVisible()) await lewati.click();
  await tombol(page, 'Oke, gue ngerti. Lanjut.').click();

  // 06 — Timeline
  await tungguScene(page, 'timeline');
  await expect(page.getByText('DP rumah di umur 57')).toBeVisible();
  await tombol(page, 'Lanjut').click();

  // 07 → 08 — Kartu hasil
  await tungguScene(page, 'nggak-sendirian');
  await tombol(page, 'Lihat kartu hasil gue').click();
  await tungguScene(page, 'kartu');
  const kartu = page.locator('img[alt^="Kartu hasil"]');
  await expect(kartu).toHaveAttribute('src', /u=57&g=31/);
  await expect(kartu).toHaveAttribute('src', /sp=-15/);

  // 09 — Aksi
  await tombol(page, 'Terus, gue harus ngapain?').click();
  await tungguScene(page, 'aksi');
  await expect(page.locator('[data-judul-scene]')).toBeVisible();
});

test('Nolak paylater: slip tabungan jujur kosong', async ({ page }) => {
  await sampaiModalPaylater(page);

  await tombol(page, 'Nggak dulu').click();
  await tungguScene(page, 'nabung');
  await expect(page.locator('#judul-nabung')).toHaveText('Nolak utang: bener. Slipnya masih kosong.');
  await expect(page.locator('li[data-lembar]').first()).toContainText('Rp 0');
});
