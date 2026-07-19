import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import Skull from 'lucide-react/dist/esm/icons/skull';

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <Skull className="w-12 h-12 text-doom-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-noir-100">Join the Archive</h1>
        <p className="mt-2 text-noir-400">Share your most spectacular failures</p>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorBackground: '#111115',
            colorPrimary: '#c41e3a',
            colorDanger: '#e63950',
            borderRadius: '0.5rem',
          },
          elements: {
            card: 'shadow-none border border-noir-700',
            headerTitle: 'text-noir-100',
            headerSubtitle: 'text-noir-400',
            socialButtonsBlockButton: 'border-noir-600 bg-noir-800 text-noir-200 hover:bg-noir-700',
            socialButtonsBlockButtonText: 'text-noir-200',
            dividerLine: 'bg-noir-700',
            dividerText: 'text-noir-400',
            formFieldLabel: 'text-noir-300',
            formFieldInput: 'bg-noir-800 border-noir-600 text-noir-100',
            formButtonPrimary: 'bg-doom-500 hover:bg-doom-400',
            footerActionText: 'text-noir-400',
            footerActionLink: 'text-doom-400 hover:text-doom-300',
          },
        }}
      />
    </div>
  );
}
