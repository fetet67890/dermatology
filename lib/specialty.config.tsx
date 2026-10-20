// Dermatology's parameters for @hypocrates/core-dashboard's generic
// extension points. See packages/core-dashboard/lib/specialty-config.ts for
// what each key does — this file only needs to declare what Dermatology
// adds/overrides.
import type { DashboardSpecialtyConfig } from '@core/lib/specialty-config'
import { DermatologjiSection } from '../components/settings/dermatologji-section'

export const specialtyConfig: DashboardSpecialtyConfig = {
  brandName: 'Hypocrates Dermatology',
  brandDescriptionSq: 'Platformë moderne për menaxhimin e klinikave dermatologjike',
  brandDescriptionEn: 'Modern platform for managing dermatology clinics',
  sidebarIconName: 'dermatology',

  navExtras: {
    admin: [],
    doktor: [],
  },

  settingsExtraSection: {
    key: 'dermatologji',
    icon: 'stethoscope',
    Component: DermatologjiSection,
  },

  documentConfig: {
    categories: ['general', 'id_card', 'insurance_card', 'clinical_photo'],
    imageSubtypes: ['klinike', 'dermoskopi', 'para', 'pas', 'tjeter'],
    batchCategory: 'clinical_photo',
  },

  patientExtraFields: [
    { jsonKey: 'fitzpatrickType', labelKey: 'fitzpatrickType', inputType: 'number' },
  ],
  featureFlags: {
    medical:      true,
    cosmetic:     true,
    isotretinoin: false,
    biopsy:       false,
    retailPos:    false,
  },

  tourExtraSteps: {
    admin: [],
    doktor: [],
  },

  treatmentTypes: [
    'Konsultë',
    'Ekzaminim i Lëkurës',
    'Krioterapi',
    'Biopsi Lëkure',
    'Trajtim Akne',
    'Trajtim Ekzeme',
    'Trajtim Psoriasis',
    'Dermoskopi',
    'Zbardhim me Lazer',
    'Peeling Kimik',
    'Injeksione Botox',
    'Filera Dermal',
  ],

  entityDeleteHandlers: [],
}
