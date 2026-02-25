import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { runSimulation } from "./simulator";

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

describe("Reproduction of integer constraint", () => {
	const targetPpn = new Decimal("14030.39");
	const refTransaction = {
		unitPrice: new Decimal(6957),
		quantity: new Decimal(20),
		discount: new Decimal(0),
	};

	it("Locked Price (Tolerance 1): should find NO result (since 18.33 is forbidden)", () => {
		const config = {
			referenceTransaction: refTransaction,
			targetPpn: targetPpn,
			tolerance: new Decimal(1),
			priceMin: new Decimal(6957),
			priceMax: new Decimal(6957), // Locked
			discountMin: new Decimal(0),
			discountMax: new Decimal(0), // Locked
			quantityMin: new Decimal(1),
			quantityMax: new Decimal(100),
			quantityStep: new Decimal(1),
			priceStep: new Decimal(1),
			discountStep: new Decimal(1),
			alpha: new Decimal(1),
			beta: new Decimal(1),
			topNResults: 10,
		};

		const results = runSimulation(config);
		console.log("Results with Tol 1:", results.length);
		expect(results.length).toBe(0); // Should be 0 now!
	});

	it("Locked Price (Tolerance 300): should find integer results (Qty 18)", () => {
		const config = {
			referenceTransaction: refTransaction,
			targetPpn: targetPpn,
			tolerance: new Decimal(300),
			priceMin: new Decimal(6957),
			priceMax: new Decimal(6957), // Locked
			discountMin: new Decimal(0),
			discountMax: new Decimal(0), // Locked
			quantityMin: new Decimal(1),
			quantityMax: new Decimal(100),
			quantityStep: new Decimal(1),
			priceStep: new Decimal(1),
			discountStep: new Decimal(1),
			alpha: new Decimal(1),
			beta: new Decimal(1),
			topNResults: 10,
		};

		const results = runSimulation(config);
		console.log("Results with Tol 300:", results.length);
		if (results.length > 0) {
			console.log("Found integer result:", {
				qty: results[0].transaction.quantity.toNumber(),
				ppn: results[0].calculatedPpn.toNumber(),
				diff: results[0].ppnDifference.toNumber(),
			});
		}
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].transaction.quantity.mod(1).isZero()).toBe(true); // Must be integer
	});

	it("Unlocked Price Range (Tolerance 1): should also find NO result", () => {
		const config = {
			referenceTransaction: refTransaction,
			targetPpn: targetPpn,
			tolerance: new Decimal(1),
			priceMin: new Decimal(6956),
			priceMax: new Decimal(6958), // Range
			discountMin: new Decimal(0),
			discountMax: new Decimal(0), // Locked
			quantityMin: new Decimal(1),
			quantityMax: new Decimal(100),
			quantityStep: new Decimal(1),
			priceStep: new Decimal(1),
			discountStep: new Decimal(1),
			alpha: new Decimal(1),
			beta: new Decimal(1),
			topNResults: 10,
		};

		const results = runSimulation(config);
		expect(results.length).toBe(0); // Consistency!
	});
});
