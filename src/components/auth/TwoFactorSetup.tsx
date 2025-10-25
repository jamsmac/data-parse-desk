/**
 * Two-Factor Authentication Setup Component
 * Allows users to enable 2FA using TOTP (Time-based One-Time Password)
 */

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onSuccess, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'backup'>('init');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      // Enroll in 2FA
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setStep('scan');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to start 2FA setup');
      console.error('2FA setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the factor ID from the enrollment
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        throw new Error('TOTP factor not found');
      }

      // Verify the code
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: verificationCode,
      });

      if (error) throw error;

      if (data) {
        // Generate recovery codes
        const codes = generateRecoveryCodes(10);
        setRecoveryCodes(codes);

        // Store recovery codes in user metadata (hashed)
        await supabase.auth.updateUser({
          data: {
            recovery_codes_hash: await hashRecoveryCodes(codes),
          },
        });

        setStep('backup');
        toast.success('2FA enabled successfully!');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Verification failed');
      console.error('2FA verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success('Secret copied to clipboard');
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2000);
    toast.success('Recovery codes copied to clipboard');
  };

  const downloadRecoveryCodes = () => {
    const content = `DataParseDesk 2FA Recovery Codes\n\nIMPORTANT: Save these codes in a secure location.\nEach code can only be used once.\n\n${recoveryCodes.join('\n')}\n\nGenerated: ${new Date().toISOString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataparsedesk-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Recovery codes downloaded');
  };

  const finish = () => {
    onSuccess?.();
  };

  if (step === 'init') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Enable Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">What is 2FA?</h4>
            <p className="text-sm text-muted-foreground">
              Two-factor authentication (2FA) adds an additional layer of security by requiring
              a verification code from your phone in addition to your password.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">What you'll need:</h4>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
              <li>Your smartphone or tablet</li>
              <li>A secure place to store recovery codes</li>
            </ul>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={startSetup} disabled={loading}>
              {loading ? 'Setting up...' : 'Start Setup'}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'scan') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {qrCode && (
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrCode} size={200} />
              </div>
            )}

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Can't scan the QR code? Enter this secret manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter the 6-digit code from your authenticator app
            </label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={verifyAndEnable}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify and Enable'}
            </Button>
            <Button variant="outline" onClick={() => setStep('init')}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'backup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save Your Recovery Codes</CardTitle>
          <CardDescription>
            Store these codes in a secure location. You'll need them to access your account if
            you lose your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Each code can only be used once. Keep them safe!
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <code>{code}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyRecoveryCodes}>
              {copiedRecovery ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Codes
                </>
              )}
            </Button>
            <Button variant="outline" onClick={downloadRecoveryCodes}>
              Download Codes
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Make sure you've saved these codes before continuing. You won't be able to see
              them again!
            </AlertDescription>
          </Alert>

          <Button onClick={finish} className="w-full">
            I've Saved My Recovery Codes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Helper functions
function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Format as XXXX-XXXX
    code = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(code);
  }

  return codes;
}

async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  // In a real implementation, you'd hash these server-side
  // This is a simplified version for demonstration
  const hashed = await Promise.all(
    codes.map(async (code) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    })
  );
  return hashed;
}
