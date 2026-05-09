import { Label } from "@/components/ui/label.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AIClarification({
	aiQuestions,
	currentQuestionIndex,
	setCurrentQuestionIndex,
	aiAnswers,
	setAIAnswers,
	otherAnswer,
	setOtherAnswer,
}) {
	if (!aiQuestions || aiQuestions.length === 0) return null;

	const currentQuestion = aiQuestions[currentQuestionIndex];

	return (
		<div className="shrink-0 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<Label className="text-slate-400 text-xs uppercase tracking-wider block">
				Làm rõ sở thích của bạn
			</Label>

			<div className="flex-1 flex flex-col">
				<h3 className="text-sm font-semibold text-white mb-4 min-h-[2.5rem]">
					{currentQuestion.question}
				</h3>

				<div className="flex flex-col gap-2 mb-4">
					{currentQuestion.options.map((opt) => (
						<button
							key={opt.id}
							onClick={() =>
								setAIAnswers((prev) => ({
									...prev,
									[currentQuestionIndex]: opt.id,
								}))
							}
							className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all text-left ${
								aiAnswers[currentQuestionIndex] === opt.id
									? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
									: "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
							}`}
						>
							<span
								className={`w-6 h-6 rounded-md flex items-center justify-center font-bold shrink-0 text-xs ${
									aiAnswers[currentQuestionIndex] === opt.id
										? "bg-white/20"
										: "bg-slate-800"
								}`}
							>
								{opt.id}
							</span>
							<span className="flex-1">{opt.text}</span>
						</button>
					))}
				</div>

				<div className="relative mb-4">
					<textarea
						placeholder="Ý kiến khác (Nhập tùy ý)..."
						value={
							aiAnswers[currentQuestionIndex] === "Other"
								? otherAnswer
								: ""
						}
						onChange={(e) => {
							setAIAnswers((prev) => ({
								...prev,
								[currentQuestionIndex]: "Other",
							}));
							setOtherAnswer(e.target.value);
						}}
						onFocus={() =>
							setAIAnswers((prev) => ({
								...prev,
								[currentQuestionIndex]: "Other",
							}))
						}
						rows={2}
						className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
					/>
				</div>

				<div className="flex items-center justify-center mt-2">
					<div className="flex items-center bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
						<button
							type="button"
							disabled={currentQuestionIndex === 0}
							onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
							className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all border-r border-slate-700 flex items-center justify-center"
						>
							<ChevronLeft size={16} />
						</button>

						<div className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800">
							{currentQuestionIndex + 1} / {aiQuestions.length}
						</div>

						<button
							type="button"
							disabled={currentQuestionIndex === aiQuestions.length - 1}
							onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
							className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all border-l border-slate-700 flex items-center justify-center"
						>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
