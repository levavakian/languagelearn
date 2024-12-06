export const FAQ = () => {
    const faqItems = [
        {
            question: "What are tooltip prompts?",
            answer: "Tooltip prompts are a way to be able to quickly ask clarifying questions without breaking up the flow of your conversation. Just click on a word and ask away!"
        },
        {
            question: "What is the difference between a lesson and a quick practice?",
            answer: "Lessons represent the core of your learning journey. Their lesson plans and summaries are taken into account when generating new lessons for you. Quick practices are for short, quick sessions and do not affect the rest of your course."
        },
        {
            question: "What are summaries?",
            answer: "Summaries are a way for the AI tutor to give you a quick overview of the lesson you just completed. They are used when generating new lessons and lesson plans to provide a consistent learning experience. Generate summaries by clicking on the edit lesson icon, or by clicking the save icon in the chat."
        },
        {
            question: "How is coin pricing and usage determined?",
            answer: "Arrata is built around OpenAI's Realtime Voice API, and pricing is a fixed percent based off of the price of how many API tokens your request consumed. As OpenAI's models and pricing improve, expect those savings to be reflected in Arrata as well."
        },
        {
            question: "My coins are depleting quickly, what's going on?",
            answer: "Long lessons will deplete coins faster than short ones as the context gets longer. Prefer smaller, more focused lessons and save your progress in between by relying on summaries."
        },
    ];

    return (
        <div className="flex flex-col max-w-[800px] mx-auto px-2 py-2">
            <div className="rounded-lg">
                <h1 className="font-nobel text-[32px] font-bold mb-6">
                    FAQ
                </h1>
                
                <div className="flex flex-col gap-6">
                    {faqItems.map((item, index) => (
                        <div key={index} className="bg-alice-blue rounded-xl px-4 py-2 flex flex-col">
                            <h2 className="text-[20px] font-semibold mb-2">
                                {item.question}
                            </h2>
                            <p className="text-[16px] text-gray-700">
                                {item.answer}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}