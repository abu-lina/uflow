interface FormNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
}

export default function FormNavigation({
  isFirstStep,
  isLastStep,
  isSubmitting,
  onBack,
  onNext
}: FormNavigationProps) {
  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
      {!isFirstStep ? (
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
      ) : (
        <div></div>
      )}
      
      <button
        type="button"
        onClick={onNext}
        disabled={isSubmitting}
        className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50"
      >
        {isLastStep 
          ? isSubmitting 
            ? 'Submitting...' 
            : 'Submit Service'
          : 'Continue'
        }
      </button>
    </div>
  );
} 