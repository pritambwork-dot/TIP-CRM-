import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Upload, 
  Compass, 
  UserPlus, 
  X,
  Sparkles,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavTab } from '../types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenImport: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenImport
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      step: 1,
      title: 'Welcome to TIP CRM',
      description: 'A calm, lightweight relationship and program workspace designed specifically for The Inclusion Project.',
      actionText: 'Get Started',
      onAction: () => setCurrentStep(2)
    },
    {
      step: 2,
      title: 'Import your existing contacts',
      description: 'Bring your Excel, Google Sheets, or CSV contact lists directly into the CRM with automated duplicate detection.',
      actionText: 'Open Import Tool',
      onAction: () => {
        onClose();
        onOpenImport();
      }
    },
    {
      step: 3,
      title: 'Explore your active programs',
      description: 'Review and manage your community programs with connected participants, events, and milestones.',
      actionText: 'View Programs',
      onAction: () => {
        onClose();
        onNavigate('programs');
      }
    },
    {
      step: 4,
      title: 'Coordinate with staff & volunteers',
      description: 'Easily toggle between full Staff visibility and restricted Volunteer views to protect sensitive donor records.',
      actionText: 'Manage Roles in Settings',
      onAction: () => {
        onClose();
        onNavigate('settings');
      }
    },
    {
      step: 5,
      title: 'You are ready to operate',
      description: 'Everything TIP needs, nothing TIP doesn’t. Use the search icon or dock anytime to quickly find any record.',
      actionText: 'Go to Operational Dashboard',
      onAction: () => {
        onClose();
        onNavigate('dashboard');
      }
    }
  ];

  const current = steps[currentStep - 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Badge variant="crimson" className="text-xs">
                  Step {current.step} of 5
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">Nonprofit Onboarding</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Step Content */}
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-sm">
                {currentStep === 1 && <Sparkles className="w-6 h-6" />}
                {currentStep === 2 && <Upload className="w-6 h-6" />}
                {currentStep === 3 && <Compass className="w-6 h-6" />}
                {currentStep === 4 && <UserPlus className="w-6 h-6" />}
                {currentStep === 5 && <CheckCircle2 className="w-6 h-6" />}
              </div>

              <h3 className="text-xl font-serif font-bold text-foreground tracking-tight mb-2">
                {current.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-sans">
                {current.description}
              </p>

              {/* Progress Indicators */}
              <div className="flex items-center gap-1.5 mb-6">
                {steps.map(s => (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      s.step === currentStep 
                        ? 'w-8 bg-primary' 
                        : s.step < currentStep 
                        ? 'w-4 bg-muted-foreground/60' 
                        : 'w-4 bg-muted'
                    }`}
                    aria-label={`Go to step ${s.step}`}
                  />
                ))}
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between">
                {currentStep > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Back
                  </Button>
                ) : <div />}

                <Button
                  variant="crimson"
                  onClick={current.onAction}
                  className="gap-2 text-sm font-semibold shadow-xs"
                >
                  <span>{current.actionText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

