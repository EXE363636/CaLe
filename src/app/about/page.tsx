import { getT, getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { PartnersSection } from '@/components/about/PartnersSection';
import { isSupabaseEnv } from '@/data/supabaseClient';

export default async function AboutPage() {
  const tx = await getTx();
  const t = await getT();
  return (
    <InfoPage
      eyebrow={tx('Về chúng tôi')}
      title={tx('Giới thiệu CaLẻ')}
      intro={t('about.intro')}
      ctas={[
        { label: tx('Tìm ca làm'), href: '/shifts' },
        { label: tx('Đăng ca tuyển'), href: '/employer/shifts/new', variant: 'secondary' },
      ]}
    >
      {/* P1 feedback F3 — gộp Tầm nhìn + Sứ mệnh, Giá trị + Niềm tin. */}
      <InfoSection title={t('about.mission.title')}>
        {t('about.mission.body')}
      </InfoSection>

      <InfoSection title={t('about.values.title')}>
        <InfoList
          items={[
            t('about.values.item.transparency'),
            t('about.values.item.payment'),
            t('about.values.item.twoWayTrust'),
            t('about.values.item.support'),
          ]}
        />
      </InfoSection>

      <InfoSection title={t('about.team.title')}>
        {t('about.team.body')}
      </InfoSection>

      <PartnersSection t={t} />

      <InfoSection title={t('about.version.title')}>
        {isSupabaseEnv() ? t('about.version.body.supabase') : t('about.version.body')}
      </InfoSection>
    </InfoPage>
  );
}
