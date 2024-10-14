export default interface User{
    email: string;
    name: string;
    events: Map<string, { status: boolean; verifier: string }>;
}