export const FAQ = () => {
    const faqItems = [
        {
            question: "Can I learn a language with Aratta alone?",
            answer: "Arrata is a tool that can help you learn a language by providing you with personalized lessons and exercises. However, it is not a standalone language learning tool and will not be able to teach you everything you need to know about a language. It is meant to supplement your learning journey with a personalized tutor or language course that adapts to your learning style and progress."
        },
        {
            question: "Why is the transcript from what I said unavailable or incorrect?",
            answer: "The model that generates the transcript for your speech is different than the one that powers the tutor's speech. Not to worry, even if the transcript seems very wrong the more powerful tutor model will likely have heard and understood you correctly."
        },
        {
            question: "Sometimes there is no audio output, or it comes out with an echo, what's going on?",
            answer: "Arrata is built around OpenAI's Realtime Voice API, which is still in beta and may not always work as expected. Try refreshing the page or starting a new lesson. If the issue persists, please reach out to us via our contact page."
        },
        {
            question: "My coins are depleting quickly, what's going on?",
            answer: "Long lessons will deplete coins faster than short ones as the context gets longer. Prefer smaller, more focused lessons and save your progress in between by relying on summaries. Open Mic mode will also lead to increased token usage, so using push to talk will help you save coins."
        },
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
            question: "What are lesson templates?",
            answer: "Lesson templates are an easy way to be able to create a repeatable structure for the types of excercises you find most helpful, and then use them as a starting point for new lessons."
        },
        {
            question: "How is coin pricing and usage determined?",
            answer: "Arrata is built around OpenAI's Realtime Voice API, and pricing is a fixed percent based off of the price of how many API tokens your request consumed. As OpenAI's models and pricing improve, expect those savings to be reflected in Arrata as well."
        },
    ];

    return (
        <div className="flex flex-col max-w-[800px] mx-auto px-2 py-2 pb-6">
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