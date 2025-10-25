/**
 * Two-Factor Authentication Verification Component
 * Used during login to verify 2FA code
 */

import { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorVerifyProps {
  factorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onUseRecoveryCode?: () => void;
}

export function TwoFactorVerify({ factorId, onSuccess, onCancel, onUseRecoveryCode }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      if (data) {
        onSuccess();
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Invalid verification code');
      console.error('2FA verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyPress={handleKeyPress}
            className="text-center text-2xl tracking-widest font-mono"
            autoFocus
          />
          <p className="text-sm text-muted-foreground text-center">
            Open your authenticator app to get your code
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          {onUseRecoveryCode && (
            <Button
              variant="outline"
              onClick={onUseRecoveryCode}
              className="w-full"
            >
              Use Recovery Code
            </Button>
          )}

          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Lost your device?</p>
          <button
            onClick={onUseRecoveryCode}
            className="text-primary hover:underline"
          >
            Use a recovery code instead
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Recovery Code Verification Component
 */
interface RecoveryCodeVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecoveryCodeVerify({ onSuccess, onCancel }: RecoveryCodeVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code || code.length < 8) {
      setError('Please enter a valid recovery code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user's recovery codes from metadata
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not found');

      const recoveryCodes = user.user.user_metadata.recovery_codes_hash as string[] || [];

      // Hash the input code
      const inputCodeHash = await hashCode(code);

      // Check if the code matches and hasn't been used
      const codeIndex = recoveryCodes.findIndex((hash: string) => hash === inputCodeHash);

      if (codeIndex === -1) {
        throw new Error('Invalid recovery code');
      }

      // Mark the code as used by removing it
      const updatedCodes = recoveryCodes.filter((_: unknown, i: number) => i !== codeIndex);

      await supabase.auth.updateUser({
        data: {
          recovery_codes_hash: updatedCodes,
        },
      });

      onSuccess();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Invalid recovery code');
      console.error('Recovery code verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Use Recovery Code</CardTitle>
        <CardDescription>
          Enter one of your recovery codes to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Each recovery code can only be used once. After using all codes, you'll need to
            set up 2FA again.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Input
            type="text"
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="text-center font-mono tracking-wider"
            autoFocus
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
            onClick={handleVerify}
            disabled={loading || code.length < 8}
            className="flex-1"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
