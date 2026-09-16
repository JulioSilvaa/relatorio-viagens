import {
  BedDouble,
  CarFront,
  CarTaxiFront,
  Ellipsis,
  Fuel,
  Gauge,
  ParkingCircle,
  Plane,
  Signpost,
  TrainFront,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface ExpenseCategoryMeta {
  icon: LucideIcon;
  colorClass: string;
  softClass: string;
}

const CATEGORY_META: Record<string, ExpenseCategoryMeta> = {
  HOTEL: { icon: BedDouble, colorClass: "text-category-hotel", softClass: "bg-category-hotel-soft" },
  DIARIA_VIAGEM: { icon: Wallet, colorClass: "text-category-diaria", softClass: "bg-category-diaria-soft" },
  ALIMENTACAO: { icon: UtensilsCrossed, colorClass: "text-category-alimentacao", softClass: "bg-category-alimentacao-soft" },
  COMBUSTIVEL: { icon: Fuel, colorClass: "text-category-combustivel", softClass: "bg-category-combustivel-soft" },
  UBER_TAXI: { icon: CarTaxiFront, colorClass: "text-category-mobilidade", softClass: "bg-category-mobilidade-soft" },
  KM_RODADOS: { icon: Gauge, colorClass: "text-category-km", softClass: "bg-category-km-soft" },
  ESTACIONAMENTO: { icon: ParkingCircle, colorClass: "text-category-estacionamento", softClass: "bg-category-estacionamento-soft" },
  METRO: { icon: TrainFront, colorClass: "text-category-metro", softClass: "bg-category-metro-soft" },
  ALUGUEL_CARRO: { icon: CarFront, colorClass: "text-category-aluguel-carro", softClass: "bg-category-aluguel-carro-soft" },
  PASSAGENS_AEREAS: { icon: Plane, colorClass: "text-category-aereo", softClass: "bg-category-aereo-soft" },
  PEDAGIO: { icon: Signpost, colorClass: "text-category-pedagio", softClass: "bg-category-pedagio-soft" },
  OUTROS: { icon: Ellipsis, colorClass: "text-category-outros", softClass: "bg-category-outros-soft" },
};

const FALLBACK_META: ExpenseCategoryMeta = {
  icon: Ellipsis,
  colorClass: "text-category-outros",
  softClass: "bg-category-outros-soft",
};

export function getExpenseCategoryMeta(code: string): ExpenseCategoryMeta {
  return CATEGORY_META[code] ?? FALLBACK_META;
}
