type StepHeaderProps = {
  step: number;
  stepTitle: string;
  stepLabels: string[];
};

export default function StepHeader({
  step,
  stepTitle,
  stepLabels,
}: StepHeaderProps) {
  return (
    <div className="sticky top-14 md:top-16 lg:static z-10 bg-white -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-6 pt-2 sm:pt-4 pb-3 sm:pb-4 lg:pt-6 lg:pb-6 mb-3 sm:mb-4 lg:mb-6 border-b border-gray-100 shadow-sm lg:border lg:border-gray-200 lg:shadow-none lg:rounded-2xl">
      <div className="hidden sm:flex gap-1.5 mb-3">
        {stepLabels.map((label, i) => {
          const num = i + 1;
          return (
            <div key={num} className="flex-1 flex flex-col gap-1">
              <div
                className={`h-1 rounded-full transition-all duration-400 ${
                  step > num
                    ? "bg-blue-500"
                    : step === num
                      ? "bg-blue-400"
                      : "bg-gray-200"
                }`}
              />
              <span
                className={`hidden sm:block text-[10px] font-medium transition-colors ${
                  step >= num ? "text-blue-500" : "text-gray-300"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="sm:hidden text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-0.5">
            Шаг {step} из {stepLabels.length}
          </p>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
            {stepTitle}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
          {stepLabels.map((_, i) => {
            const num = i + 1;
            return (
              <div
                key={num}
                className={`rounded-full transition-all duration-300 ${
                  step === num
                    ? "w-5 h-2 bg-blue-500"
                    : step > num
                      ? "w-2 h-2 bg-blue-300"
                      : "w-2 h-2 bg-gray-200"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
