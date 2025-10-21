import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description: string;
}

interface SchemaStepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}

export function SchemaStepper({ steps, currentStep, completedSteps }: SchemaStepperProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="w-full py-6">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{
            width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isPast = index < currentStepIndex;

            return (
              <div key={step.id} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                {/* Step Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-background',
                    {
                      'border-primary bg-primary text-primary-foreground': isCompleted || isCurrent,
                      'border-muted text-muted-foreground': !isCompleted && !isCurrent && !isPast,
                      'border-primary/50 text-primary': isPast && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className={cn('h-5 w-5', { 'fill-current': isCurrent })} />
                  )}
                </div>

                {/* Step Info */}
                <div className="mt-2 text-center max-w-[120px]">
                  <p
                    className={cn('text-sm font-medium', {
                      'text-primary': isCurrent || isCompleted,
                      'text-muted-foreground': !isCurrent && !isCompleted,
                    })}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn('text-xs mt-1', {
                      'text-primary/70': isCurrent,
                      'text-muted-foreground': !isCurrent,
                    })}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
