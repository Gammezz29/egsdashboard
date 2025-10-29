import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { DASHBOARD_ROLE_OPTIONS, isMasterUser } from "@/lib/accessControl";
import { inviteDashboardUser } from "@/lib/userInvitations";

const CUSTOM_ROLE_VALUE = "custom";

const normaliseRoleValue = (value: string) => value.trim().toLowerCase();

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!isMasterUser(user)) {
    return <Navigate to="/" replace />;
  }

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(
    DASHBOARD_ROLE_OPTIONS.length > 0 ? DASHBOARD_ROLE_OPTIONS[0].value : CUSTOM_ROLE_VALUE,
  );
  const [customRole, setCustomRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inviteRedirectTo = useMemo(() => {
    const raw = import.meta.env.VITE_SUPABASE_INVITE_REDIRECT as string | undefined;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
  }, []);

  const resolvedRole =
    role === CUSTOM_ROLE_VALUE ? normaliseRoleValue(customRole) : normaliseRoleValue(role);

  const isFormValid = email.trim().length > 0 && resolvedRole.length > 0 && !isSubmitting;

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteDashboardUser(email, resolvedRole, { redirectTo: inviteRedirectTo });
      toast({
        title: "Invitación enviada",
        description: `Invitamos a ${email.trim().toLowerCase()} con el rol ${resolvedRole}.`,
      });
      setEmail("");
      if (role === CUSTOM_ROLE_VALUE) {
        setCustomRole("");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No pudimos enviar la invitación. Intenta nuevamente.";
      toast({
        title: "Error al invitar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl space-y-8 p-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Solo los administradores maestros pueden gestionar accesos desde aquí.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Invitar usuario al dashboard</CardTitle>
            <CardDescription>
              Envía un correo de invitación y define el rol que tendrá el usuario en el momento de crear la cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleInvite}>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Correo electrónico</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@egsai.dev"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {DASHBOARD_ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_ROLE_VALUE}>Otro rol…</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === CUSTOM_ROLE_VALUE ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-role">Nombre del rol</Label>
                  <Input
                    id="custom-role"
                    value={customRole}
                    onChange={(event) => setCustomRole(event.target.value)}
                    placeholder="Ej. operaciones-norte"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa un identificador en minúsculas. Será guardado en la metadata del usuario tal como lo escribas.
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-end">
                <Button type="submit" disabled={!isFormValid} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? "Enviando…" : "Enviar invitación"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
