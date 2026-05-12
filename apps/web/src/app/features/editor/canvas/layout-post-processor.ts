import { Solver, Variable, Operator, Strength, Expression, Constraint } from '@lume/kiwi';

export interface LayoutElement {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  opacity?: number;
  type?: string;
}

export interface LayoutAdjustment {
  id: string;
  left: number;
  top: number;
}

export interface LayoutOptions {
  safeMargin?: number;
  minGap?: number;
  gridColumns?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  safeMargin: 60,
  minGap: 30,
  gridColumns: 12,
};

/**
 * Constraint-based layout post-processor using the Cassowary algorithm (@lume/kiwi).
 *
 * Resolves overlapping elements and enforces safe margins and alignment
 * after AI-generated designs are applied to the canvas.
 *
 * Background elements (full-canvas rects, low-opacity overlays) are locked in place.
 * Foreground elements are repositioned by the solver to satisfy:
 * - Required: safe margins, elements stay within canvas bounds
 * - Strong: non-overlap between foreground pairs (vertical separation)
 * - Medium: stay near original AI-generated positions (via edit variables)
 * - Weak: snap to grid column lines, align edges within zones
 */
export class LayoutPostProcessor {

  static processLayout(
    elements: LayoutElement[],
    canvasWidth: number,
    canvasHeight: number,
    options?: LayoutOptions
  ): LayoutAdjustment[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const { safeMargin, minGap, gridColumns } = opts;

    if (elements.length === 0) return [];

    const { backgrounds, foregrounds } = classifyElements(elements, canvasWidth, canvasHeight);

    if (foregrounds.length === 0) {
      return elements.map(el => ({
        id: el.id,
        left: clamp(el.left, safeMargin, canvasWidth - safeMargin - el.width),
        top: clamp(el.top, safeMargin, canvasHeight - safeMargin - el.height),
      }));
    }

    const solver = new Solver();

    // Create constraint variables for each foreground element
    const vars = new Map<string, { left: Variable; top: Variable }>();
    for (const el of foregrounds) {
      const leftVar = new Variable(`${el.id}_left`);
      const topVar = new Variable(`${el.id}_top`);
      vars.set(el.id, { left: leftVar, top: topVar });

      // Required: left margin
      solver.addConstraint(new Constraint(leftVar, Operator.Ge, safeMargin, Strength.required));
      // Required: top margin
      solver.addConstraint(new Constraint(topVar, Operator.Ge, safeMargin, Strength.required));
      // Required: right boundary — left + width <= canvasWidth - safeMargin
      const rightExpr = new Expression(leftVar, el.width);
      solver.addConstraint(new Constraint(rightExpr, Operator.Le, canvasWidth - safeMargin, Strength.required));
      // Required: bottom boundary — top + height <= canvasHeight - safeMargin
      const bottomExpr = new Expression(topVar, el.height);
      solver.addConstraint(new Constraint(bottomExpr, Operator.Le, canvasHeight - safeMargin, Strength.required));

      // Medium: stay near original position via edit variables
      solver.addEditVariable(leftVar, Strength.medium);
      solver.addEditVariable(topVar, Strength.medium);
      solver.suggestValue(leftVar, el.left);
      solver.suggestValue(topVar, el.top);

      // Weak: snap to grid column lines
      const gridSpacing = canvasWidth / gridColumns;
      const nearestGridX = Math.round(el.left / gridSpacing) * gridSpacing;
      solver.addConstraint(new Constraint(leftVar, Operator.Eq, nearestGridX, Strength.weak));
    }

    // Strong: non-overlap — vertical separation for horizontally overlapping pairs
    const sortedForegrounds = [...foregrounds].sort((a, b) => a.top - b.top || a.left - b.left);

    for (let i = 0; i < sortedForegrounds.length; i++) {
      for (let j = i + 1; j < sortedForegrounds.length; j++) {
        const elA = sortedForegrounds[i];
        const elB = sortedForegrounds[j];
        const varsA = vars.get(elA.id)!;
        const varsB = vars.get(elB.id)!;

        // Check horizontal overlap using original positions
        const aRight = elA.left + elA.width;
        const bRight = elB.left + elB.width;
        const horizontalOverlap = !(elB.left >= aRight || bRight <= elA.left);

        if (horizontalOverlap) {
          // Strong constraint: B.top >= A.top + A.height + gap
          const belowExpr = new Expression(varsA.top, elA.height, minGap);
          solver.addConstraint(new Constraint(varsB.top, Operator.Ge, belowExpr, Strength.strong));
        }
      }
    }

    // Weak: align left edges of elements in the same horizontal band (zone)
    const bandHeight = canvasHeight / 3;
    for (let band = 0; band < 3; band++) {
      const bandTop = band * bandHeight;
      const bandBottom = bandTop + bandHeight;
      const bandElements = sortedForegrounds.filter(
        el => el.top >= bandTop && el.top < bandBottom
      );

      if (bandElements.length >= 2) {
        const leftAligned = bandElements.filter(el => el.left < canvasWidth / 3);

        // Align left edges for left-aligned elements in the same band
        if (leftAligned.length >= 2) {
          const refVar = vars.get(leftAligned[0].id)!.left;
          for (let k = 1; k < leftAligned.length; k++) {
            const otherVar = vars.get(leftAligned[k].id)!.left;
            solver.addConstraint(new Constraint(otherVar, Operator.Eq, refVar, Strength.weak));
          }
        }

        // Align center positions for center-aligned elements
        const centerAligned = bandElements.filter(
          el => el.left >= canvasWidth / 3 && el.left < (canvasWidth * 2) / 3
        );
        if (centerAligned.length >= 2) {
          const refVar = vars.get(centerAligned[0].id)!.left;
          for (let k = 1; k < centerAligned.length; k++) {
            const otherVar = vars.get(centerAligned[k].id)!.left;
            solver.addConstraint(new Constraint(otherVar, Operator.Eq, refVar, Strength.weak));
          }
        }
      }
    }

    // Solve
    solver.updateVariables();

    // Build results
    const adjustments: LayoutAdjustment[] = [];

    // Foreground elements get solver-adjusted positions
    for (const el of foregrounds) {
      const elVars = vars.get(el.id)!;
      let newLeft = elVars.left.value();
      let newTop = elVars.top.value();

      // Final clamp (solver should handle this, but double-check)
      newLeft = clamp(newLeft, safeMargin, canvasWidth - safeMargin - el.width);
      newTop = clamp(newTop, safeMargin, canvasHeight - safeMargin - el.height);

      adjustments.push({ id: el.id, left: Math.round(newLeft), top: Math.round(newTop) });
    }

    // Background elements: keep original positions (or clamp to safe margins)
    for (const el of backgrounds) {
      const isFullCanvas = el.left <= 5 && el.top <= 5 &&
        (el.width >= canvasWidth - 10 || (el.opacity !== undefined && el.opacity < 0.5));
      if (isFullCanvas) {
        adjustments.push({ id: el.id, left: Math.round(el.left), top: Math.round(el.top) });
      } else {
        adjustments.push({
          id: el.id,
          left: Math.round(clamp(el.left, safeMargin, canvasWidth - safeMargin - el.width)),
          top: Math.round(clamp(el.top, safeMargin, canvasHeight - safeMargin - el.height)),
        });
      }
    }

    return adjustments;
  }
}

function classifyElements(
  elements: LayoutElement[],
  canvasWidth: number,
  canvasHeight: number
): { backgrounds: LayoutElement[]; foregrounds: LayoutElement[] } {
  const backgrounds: LayoutElement[] = [];
  const foregrounds: LayoutElement[] = [];

  for (const el of elements) {
    const isBackground =
      (el.opacity !== undefined && el.opacity < 0.5) ||
      (el.type === 'rect' &&
        el.left <= 5 && el.top <= 5 &&
        el.width >= canvasWidth - 10 && el.height >= canvasHeight - 10) ||
      (el.width * el.height > (canvasWidth * canvasHeight) * 0.5);

    if (isBackground) {
      backgrounds.push(el);
    } else {
      foregrounds.push(el);
    }
  }

  return { backgrounds, foregrounds };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}