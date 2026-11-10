export interface GenerateOptions {
    schema: string;
    output: string;
    rls: boolean;
    realtime: boolean;
    auth: boolean;
    types: boolean;
}
export declare function generateMigrations(options: GenerateOptions): Promise<void>;
//# sourceMappingURL=generate.d.ts.map