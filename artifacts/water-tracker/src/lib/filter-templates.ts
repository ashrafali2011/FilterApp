export interface CartridgeTemplate {
  name: string;
  stageNumber: number;
  intervalDays: number;
}

export interface FilterTemplate {
  type: string;
  label: string;
  labelAr: string;
  cartridges: CartridgeTemplate[];
}

export const FILTER_TEMPLATES: FilterTemplate[] = [
  {
    type: "single",
    label: "Single Stage",
    labelAr: "مرحلة واحدة",
    cartridges: [
      { name: "Sediment Filter", stageNumber: 1, intervalDays: 90 },
    ],
  },
  {
    type: "three_stage",
    label: "3-Stage",
    labelAr: "3 مراحل",
    cartridges: [
      { name: "Sediment Filter (Stage 1)", stageNumber: 1, intervalDays: 90 },
      { name: "Carbon Block (Stage 2)", stageNumber: 2, intervalDays: 180 },
      { name: "Post Carbon (Stage 3)", stageNumber: 3, intervalDays: 180 },
    ],
  },
  {
    type: "five_stage",
    label: "5-Stage",
    labelAr: "5 مراحل",
    cartridges: [
      { name: "Sediment Filter (Stage 1)", stageNumber: 1, intervalDays: 90 },
      { name: "Carbon Block (Stage 2)", stageNumber: 2, intervalDays: 180 },
      { name: "Carbon Block (Stage 3)", stageNumber: 3, intervalDays: 180 },
      { name: "RO Membrane (Stage 4)", stageNumber: 4, intervalDays: 365 },
      { name: "Post Carbon (Stage 5)", stageNumber: 5, intervalDays: 365 },
    ],
  },
  {
    type: "seven_stage",
    label: "7-Stage",
    labelAr: "7 مراحل",
    cartridges: [
      { name: "Sediment Filter (Stage 1)", stageNumber: 1, intervalDays: 90 },
      { name: "Carbon Block (Stage 2)", stageNumber: 2, intervalDays: 180 },
      { name: "Carbon Block (Stage 3)", stageNumber: 3, intervalDays: 180 },
      { name: "RO Membrane (Stage 4)", stageNumber: 4, intervalDays: 365 },
      { name: "Post Carbon (Stage 5)", stageNumber: 5, intervalDays: 365 },
      { name: "Alkaline Filter (Stage 6)", stageNumber: 6, intervalDays: 365 },
      { name: "UV Sterilizer (Stage 7)", stageNumber: 7, intervalDays: 365 },
    ],
  },
  {
    type: "custom",
    label: "Custom",
    labelAr: "مخصص",
    cartridges: [],
  },
];

export function getTemplate(type: string): FilterTemplate | undefined {
  return FILTER_TEMPLATES.find(t => t.type === type);
}
