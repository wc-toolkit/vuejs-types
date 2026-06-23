export class MyComponent extends HTMLElement {
  title: string;
  count: number;
  disabled: boolean;
  variant: "primary" | "neutral" | "danger";
  user: { name: string } | null;
  items: string[];

  increment(by?: number): number;
  reset(): void;
  focusButton(): void;
}
