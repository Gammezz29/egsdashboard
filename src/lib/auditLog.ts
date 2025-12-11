import { User } from "@supabase/supabase-js";

const AUDIT_WEBHOOK_URL = "https://workflow.egsai.dev/webhook/audit-log";

interface PhiAccessEvent {
    action: string;
    phi_fields_accessed: string[];
    metadata?: Record<string, unknown>;
    wf_id?: string;
    exec_id?: string;
}

const generateUserHash = async (userId: string): Promise<string> => {
    const encoder = new TextEncoder();
    const salt = "egs-audit-salt-v1"; // In a real app, this should be an env var
    const data = encoder.encode(userId + salt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const logPhiAccess = async (
    user: User | null | undefined,
    event: PhiAccessEvent
): Promise<void> => {
    if (!user) return;

    try {
        const userHash = await generateUserHash(user.id);
        const ipResponse = await fetch("https://api.ipify.org?format=json").catch(() => null);
        const ipData = ipResponse ? await ipResponse.json() : { ip: "unknown" };

        const payload = {
            event_type: "PHI_ACCESS",
            user_hash: userHash,
            action: event.action,
            system: "dashboard", // Identified as the dashboard
            ip_source: ipData.ip,
            phi_fields_accessed: event.phi_fields_accessed,
            result: "success",
            session_id: `sess_${Date.now()}`, // Simple session ID for now
            workflow_id: event.wf_id || "wf_dashboard_access",
            execution_id: event.exec_id || `exec_${new Date().toISOString().replace(/[-:T.]/g, "")}`,
            metadata: event.metadata || {},
        };

        // Fire and forget - don't block UI
        fetch(AUDIT_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }).catch((err) => {
            console.error("Failed to send audit log:", err);
        });
    } catch (error) {
        console.error("Error generating audit log:", error);
    }
};
