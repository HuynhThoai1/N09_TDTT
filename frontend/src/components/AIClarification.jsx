import { Label } from "@/components/ui/label.jsx";
import { ChevronLeft, ChevronRight, Navigation } from "lucide-react";

export default function AIClarification({
    isOpen,
    onClose,
    onFinish,
	aiQuestions,
	currentQuestionIndex,
	setCurrentQuestionIndex,
	aiAnswers,
	setAIAnswers,
	otherAnswer,
	setOtherAnswer,
}) {
	if (!isOpen || !aiQuestions || aiQuestions.length === 0) return null;

	const currentQuestion = aiQuestions[currentQuestionIndex];

	return (
        // Overlay mờ
        <div 
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
            onClick={(e) => {
                // Click ngoài modal thì đóng
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Box */}
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            ✨ Cần thêm thông tin
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Hệ thống AI cần làm rõ một vài ý để gợi ý chính xác hơn.
                        </p>
                    </div>

                    <div className="flex items-center bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-inner shrink-0">
                        <button
                            type="button"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                            className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors border-r border-slate-700 flex items-center justify-center"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="px-4 py-1.5 text-sm font-semibold text-slate-300 bg-slate-800 tracking-widest whitespace-nowrap">
                            {currentQuestionIndex + 1} / {aiQuestions.length}
                        </div>

                        <button
                            type="button"
                            disabled={currentQuestionIndex === aiQuestions.length - 1}
                            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                            className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors border-l border-slate-700 flex items-center justify-center"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Body cuộn được */}
                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar space-y-6">
                    <div className="flex-1 flex flex-col">
                        <h3 className="text-base font-medium text-white mb-5 leading-relaxed">
                            {currentQuestion.question}
                        </h3>

                        <div className="flex flex-col gap-3 mb-6">
                            {currentQuestion.options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                        setAIAnswers((prev) => ({
                                            ...prev,
                                            [currentQuestionIndex]: opt.id,
                                        }))
                                    }
                                    className={`flex items-center gap-3 p-4 rounded-xl border text-sm transition-all text-left group ${
                                        aiAnswers[currentQuestionIndex] === opt.id
                                            ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] scale-[1.02]"
                                            : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                                    }`}
                                >
                                    <span
                                        className={`w-7 h-7 rounded-md flex items-center justify-center font-bold shrink-0 text-xs transition-colors ${
                                            aiAnswers[currentQuestionIndex] === opt.id
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200"
                                        }`}
                                    >
                                        {opt.id}
                                    </span>
                                    <span className="flex-1">{opt.text}</span>
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <textarea
                                placeholder="Ý kiến khác của bạn (Nhập tùy ý)..."
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
                                rows={3}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 border-t border-slate-800 shrink-0 flex gap-3 bg-slate-900/80 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onFinish}
                        className="flex-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] flex items-center justify-center gap-2"
                    >
                        <Navigation size={18} />
                        Gợi ý ngay
                    </button>
                </div>
            </div>
		</div>
	);
}
