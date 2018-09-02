export interface Url {
    port: string;
    path: string;
    host: string;
    protocol: string;
    id: string;
    href: string;
    source: any;
    query: string;
}
export declare function url(uri: string, loc?: Location): Url;
