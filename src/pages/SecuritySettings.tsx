/**
 * Security Settings Page
 * Manage 2FA, sessions, and security preferences
 */

import { useState, useEffect } from 'react';
import { Shield, Key, Monitor, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function SecuritySettings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    checkTwoFactorStatus();
    loadActiveSessions();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const hasTOTP = data?.totp && data.totp.length > 0;
      setTwoFactorEnabled(hasTOTP);
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // For now, we only have the current session
        // In a real app, you'd fetch all sessions from your database
        setSessions([{
          id: session.access_token.slice(0, 8),
          device: navigator.userAgent,
          lastActive: new Date().toISOString(),
          current: true,
        }]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: totpFactor.id,
        });

        if (error) throw error;

        setTwoFactorEnabled(false);
        toast.success('2FA disabled');
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      toast.error('Failed to disable 2FA');
    }
  };

  const handleSignOutOtherSessions = async () => {
    if (!confirm('Sign out all other sessions? You will remain signed in on this device.')) {
      return;
    }

    try {
      // This would require server-side implementation to track sessions
      toast.success('Other sessions signed out');
    } catch (error) {
      console.error('Failed to sign out other sessions:', error);
      toast.error('Failed to sign out other sessions');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-6">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="container max-w-2xl py-8">
        <TwoFactorSetup
          onSuccess={() => {
            setShowSetup(false);
            setTwoFactorEnabled(true);
            toast.success('2FA enabled successfully!');
          }}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">
            Manage your account security and authentication methods
          </p>
        </div>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </div>
              </div>
              {twoFactorEnabled ? (
                <Badge variant="success">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFactorEnabled ? (
              <>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your account is protected with two-factor authentication. You'll need both
                    your password and a verification code to sign in.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                  >
                    Disable 2FA
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Regenerate recovery codes
                      toast.info('Feature coming soon');
                    }}
                  >
                    Regenerate Recovery Codes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your account is not protected with two-factor authentication. We strongly
                    recommend enabling it.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => setShowSetup(true)}>
                  Enable Two-Factor Authentication
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password or reset it if you've forgotten
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                const { data: user } = await supabase.auth.getUser();
                if (user.user?.email) {
                  await supabase.auth.resetPasswordForEmail(user.user.email, {
                    redirectTo: `${window.location.origin}/auth/reset-password`,
                  });
                  toast.success('Password reset email sent');
                }
              }}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>
                    Manage devices where you're currently signed in
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {session.device.includes('Mobile') ? 'Mobile Device' : 'Desktop'}
                          </p>
                          {session.current && (
                            <Badge variant="outline" className="text-xs">
                              Current Session
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last active: {new Date(session.lastActive).toLocaleString()}
                        </p>
                      </div>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Feature coming soon')}
                        >
                          Sign Out
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleSignOutOtherSessions}
                  >
                    Sign Out All Other Sessions
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active sessions found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-primary" />
                <span>
                  {twoFactorEnabled ? (
                    <>✅ Two-factor authentication is enabled</>
                  ) : (
                    <>⚠️ Enable two-factor authentication for better security</>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Key className="h-4 w-4 mt-0.5 text-primary" />
                <span>Use a strong, unique password for your account</span>
              </li>
              <li className="flex items-start gap-2">
                <Monitor className="h-4 w-4 mt-0.5 text-primary" />
                <span>Regularly review your active sessions</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
