/**
 * Form-level validation for simulation inputs.
 * Separate from simulator.ts validation — this runs in the UI before submission.
 */

export interface FormState {
  refPrice: number | null;
  refQuantity: number | null;
  refDiscount: number | null;
  targetPpn: number | null;
  priceMin: number | null;
  priceMax: number | null;
  discountMin: number | null;
  discountMax: number | null;
  qtyMin: number | null;
  qtyMax: number | null;
  isPriceLocked: boolean;
  isQtyLocked: boolean;
  isDiscountLocked: boolean;
}

/**
 * Validate form inputs and return array of error messages.
 * Empty array = valid.
 */
export function validateFormInputs(state: FormState): string[] {
  const errors: string[] = [];

  if (!state.refPrice || state.refPrice <= 0) {
    errors.push("Harga satuan acuan harus positif");
  }
  if (!state.refQuantity || state.refQuantity <= 0) {
    errors.push("Kuantitas acuan harus positif");
  }
  if (state.refDiscount !== null && state.refDiscount < 0) {
    errors.push("Potongan acuan tidak boleh negatif");
  }
  if (!state.targetPpn || state.targetPpn <= 0) {
    errors.push("Target PPN harus positif");
  }

  // Only validate ranges if not locked
  if (!state.isPriceLocked) {
    if (state.priceMin !== null && state.priceMax !== null && state.priceMin > state.priceMax) {
      errors.push("Harga Min tidak boleh lebih besar dari Harga Max");
    }
    // Also validate locked price value
    if (state.isPriceLocked && state.priceMin !== null && state.priceMin <= 0) {
      errors.push("Harga satuan locked harus positif");
    }
  }
  if (!state.isDiscountLocked) {
    if (state.discountMin !== null && state.discountMax !== null && state.discountMin > state.discountMax) {
      errors.push("Potongan Min tidak boleh lebih besar dari Potongan Max");
    }
    // Also validate locked discount value
    if (state.isDiscountLocked && state.discountMin !== null && state.discountMin < 0) {
      errors.push("Potongan locked tidak boleh negatif");
    }
  }
  if (!state.isQtyLocked) {
    if (state.qtyMin !== null && state.qtyMax !== null && state.qtyMin > state.qtyMax) {
      errors.push("Qty Min tidak boleh lebih besar dari Qty Max");
    }
    // Also validate locked qty value
    if (state.isQtyLocked && state.qtyMin !== null && state.qtyMin <= 0) {
      errors.push("Kuantitas locked harus positif");
    }
  }

  return errors;
}
