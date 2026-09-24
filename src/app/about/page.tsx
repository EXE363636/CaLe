import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { PartnersSection } from '@/components/about/PartnersSection';
import { t } from '@/i18n/vi';
import { isSupabaseEnv } from '@/data/supabaseClient';

export const metadata = { title: 'Giới thiệu — CaLẻ' };

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Về chúng tôi"
      title="Giới thiệu CaLẻ"
      intro={t('about.intro')}
      ctas={[
        { label: 'Tìm ca làm', href: '/shifts' },
        { label: 'Đăng ca tuyển', href: '/employer/shifts/new', variant: 'secondary' },
      ]}
    >
      <InfoSection title={t('about.vision.title')}>
        {t('about.vision.body')}
      </InfoSection>

      <InfoSection title={t('about.mission.title')}>
        {t('about.mission.body')}
      </InfoSection>

      <InfoSection title={t('about.values.title')}>
        <InfoList
          items={[
            t('about.values.item.transparency'),
            t('about.values.item.twoWayTrust'),
            t('about.values.item.safety'),
            t('about.values.item.userCentric'),
          ]}
        />
      </InfoSection>

      <InfoSection title={t('about.trust.title')}>
        <InfoList
          items={[
            t('about.trust.item.payment'),
            t('about.trust.item.reputation'),
            t('about.trust.item.cancellation'),
            t('about.trust.item.support'),
          ]}
        />
      </InfoSection>

      <InfoSection title={t('about.team.title')}>
        {t('about.team.body')}
      </InfoSection>

      <PartnersSection />

      <InfoSection title={t('about.version.title')}>
        {isSupabaseEnv() ? t('about.version.body.supabase') : t('about.version.body')}
      </InfoSection>
    </InfoPage>
  );
}
