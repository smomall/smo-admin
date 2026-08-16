// Type declarations for shadcn-vue dependencies that may not be installed
declare module '@internationalized/date' {
  export function getLocalTimeZone(): string
  export function today(tz: string): Date
  export function CalendarDate(year: number, month: number, day: number): Date
  export function parseDate(date: string): Date
}

declare module '@unovis/vue' {
  import { DefineComponent } from 'vue'
  export const VisCrosshair: DefineComponent<object>
  export const VisTooltip: DefineComponent<object>
}