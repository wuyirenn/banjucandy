export type NavFilter =
    | { type: 'sketches'; year: number; month: number }
    | { type: 'projects'; projectId: string }
    | { type: 'fan_art'; artist?: string }
    | null;
