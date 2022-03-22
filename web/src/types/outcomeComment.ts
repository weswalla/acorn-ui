import { AgentPubKeyB64, HeaderHashB64 } from "./shared";

export interface OutcomeComment {
    outcomeAddress: HeaderHashB64,
    content: string,
    agentAddress: AgentPubKeyB64,
    unixTimestamp: number, //f64,
    isImported: boolean,
}