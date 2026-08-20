import { z } from 'zod'
import {
  Product,
  SellingPlanGroup
} from '../../../core/shopify/schemas/product.js'

export const Settings = z.object({
  moneyFormat: z.string().optional()
})
export type Settings = z.infer<typeof Settings>

export const SellingPlanSettings = z.object({
  oneTimeLabel: z.string()
})
export type SellingPlanSettings = z.infer<typeof SellingPlanSettings>

export const InitialVariantId = z.number()
export type InitialVariantId = z.infer<typeof InitialVariantId>

export const SelectedSellingPlanId = z.number().nullable().optional()
export type SelectedSellingPlanId = z.infer<typeof SelectedSellingPlanId>

export const FirstSellingPlanId = z.number().nullable().optional()
export type FirstSellingPlanId = z.infer<typeof FirstSellingPlanId>

export const UnselectedOptions = z
  .array(z.string())
  .nullable()
  .optional()
  .default(null)
export type UnselectedOptions = z.infer<typeof UnselectedOptions>

export const OptionsLayout = z.enum(['simple', 'bundle', 'smp'])
export type OptionsLayout = z.infer<typeof OptionsLayout>

const normalizeOptionsLayoutSetting = (value: unknown): OptionsLayout => {
  if (value == null || value === '' || value === 'auto') {
    return 'simple'
  }

  const raw: unknown = Array.isArray(value) ? value[0] : value

  if (typeof raw !== 'string') {
    return 'simple'
  }

  const normalized = raw.trim().toLowerCase()

  if (normalized === 'bundle') {
    return 'bundle'
  }

  if (normalized === 'smp') {
    return 'smp'
  }

  return 'simple'
}

export const SmpSiblingOption = z.object({
  productId: z.number(),
  url: z.string(),
  displayLabel: z.string(),
  badge: z.string().optional().default(''),
  description: z.string().optional().default(''),
  imageUrl: z.string().nullable().optional().default(null),
  useSwatchImageSize: z.boolean().optional().default(false),
  swatchHex: z.string().nullable().optional().default(null),
  isCurrentProduct: z.boolean().optional().default(false)
})
export type SmpSiblingOption = z.infer<typeof SmpSiblingOption>

export const BundleOptionValue = z.object({
  displayLabel: z.string(),
  matchToken: z.string().optional().default(''),
  swatchHex: z.string().nullable().optional().default(null),
  imageUrl: z.string().nullable().optional().default(null),
  badge: z.string().optional().default(''),
  description: z.string().optional().default(''),
  isDefault: z.boolean().optional().default(false)
})
export type BundleOptionValue = z.infer<typeof BundleOptionValue>

export const BundleOptionDimension = z.object({
  rowLabel: z.string(),
  options: z.array(BundleOptionValue).optional().default([])
})
export type BundleOptionDimension = z.infer<typeof BundleOptionDimension>

export const VariantDisplay = z.object({
  variantId: z.number(),
  optionValue: z.string(),
  hasSubscription: z.boolean().optional().default(false),
  sellingPlanId: z.number().nullable().optional().default(null),
  sellingPlanName: z.string().optional().default(''),
  subscriptionAdditionalInformation: z.string().optional().default(''),
  numberOfServings: z.number().nullable().optional().default(null),
  displayPrice: z.number().optional(),
  compareAtPrice: z.number().nullable().optional().default(null)
})
export type VariantDisplay = z.infer<typeof VariantDisplay>

export const ProductOptionsIO = z.object({
  product: Product,
  variantDisplay: z.array(VariantDisplay).optional().default([]),
  sellingPlanRequired: z.boolean().optional(),
  sellingPlanGroups: z.array(SellingPlanGroup).optional(),
  initialVariantId: InitialVariantId,
  unselectedOptions: UnselectedOptions,
  sellingPlanSettings: SellingPlanSettings,
  selectedSellingPlanId: SelectedSellingPlanId.optional(),
  firstSellingPlanId: FirstSellingPlanId.optional(),
  hiddenVariantIds: z.array(z.number()).optional().default([]),
  subscriptionBenefits: z.string().optional().default(''),
  optionsLayoutOverride: z
    .unknown()
    .optional()
    .transform(normalizeOptionsLayoutSetting)
    .default('simple'),
  smpSiblingOptions: z.array(SmpSiblingOption).optional().default([]),
  smpSelectorLabel: z.string().optional().default(''),
  optionValuePrefix: z.string().optional().default(''),
  bundleOptionDimensions: z.array(BundleOptionDimension).optional().default([]),
  settings: Settings
})

export type ProductOptionsIO = z.infer<typeof ProductOptionsIO>
