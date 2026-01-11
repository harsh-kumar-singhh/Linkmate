export default function HowItWorksPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-4xl font-bold text-slate-900 mb-8">How it Works</h1>

            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Connect your LinkedIn Account</h2>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        To get started, you'll need to sign in with your LinkedIn account. We use secure OAuth authentication
                        to ensure your credentials remain safe. We only request the minimum permissions needed to publish posts
                        on your behalf.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Create Content with AI Assistance</h2>
                    <p className="text-lg text-slate-600 leading-relaxed mb-4">
                        Use our powerful editor to write your posts. If you're stuck, click "Generate with AI" to get ideas or full drafts.
                        You can specify a topic and a style (e.g., "Professional", "Casual").
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                        <h3 className="text-md font-semibold text-blue-900 mb-2">✨ Pro Tip: "Write Like Me"</h3>
                        <p className="text-blue-700">
                            Our AI can analyze your past posts to learn your unique voice. Select the "Write Like Me" style
                            to generate content that sounds authentic to you.
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Schedule or Publish</h2>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        Once your masterpiece is ready, you have options:
                    </p>
                    <ul className="mt-4 space-y-3">
                        <li className="flex items-start gap-3">
                            <span className="bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 text-xs font-bold mt-1">DRAFT</span>
                            <span className="text-slate-600">Save it for later if you're not quite finished.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs font-bold mt-1">SCHEDULE</span>
                            <span className="text-slate-600">Pick a date and time for automatic publishing. We'll handle the rest.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-bold mt-1">POST NOW</span>
                            <span className="text-slate-600">Send it to LinkedIn immediately.</span>
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-slate-800 mb-4">Limitations</h2>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                        <li>Maximum post length is 3000 characters (LinkedIn limit).</li>
                        <li>Image and video uploads are currently in beta.</li>
                        <li>API usage is subject to LinkedIn's rate limits.</li>
                    </ul>
                </section>
            </div>
        </div>
    )
}
