Try it out: https://patchy-ai.vercel.app/

Check our demo video/skit: https://youtu.be/fSHdDeWpffU?si=lFjwo-XeD8xzdu55

<img width="1204" height="651" alt="Screenshot 2025-07-20 at 9 20 55 AM" src="https://github.com/user-attachments/assets/aedd257f-1d84-4175-9168-a617ba1a076f" />
<img width="702" height="642" alt="Screenshot 2025-07-20 at 9 22 02 AM" src="https://github.com/user-attachments/assets/fb3eed59-70ea-4007-84a2-741dcf5a8898" />

**Inspiration**

With the rapid advancement of AI tools, people become more and more accustomed to vibecoding. However, a major shortcoming of many of these tools is their lack of focus on cybersecurity. They often prioritize delivering a minimum viable product over ensuring that they output secure code for developers to deploy, leaving projects exposed to vulnerabilities. That’s where Patchy comes in. It automatically patches potential cybersecurity threats, allowing you to build and ship both quickly and safely.

**What it does**

Patchy is an easy-to-use website where users can paste a link to their GitHub repository. It is designed for all types of developers to help secure their builds, regardless of their level of cybersecurity expertise. Once a user submits their repository link, Patchy uses AI agents to analyze and understand the codebase. It identifies the different potential vulnerabilities, their risk levels, and consequences, as well as recommended code fixes and other relevant security insights. Compared to many existing tools that suggest cybersecurity fixes line-by-line, Patchy instead focuses on the bigger picture by using AI to understand the full context of the codebase rather than offering isolated, one-line suggestions.

Patchy summarizes all of this information using easy-to-understand language through comments and README files that help users actually learn. To prevent users from simply accepting changes without understanding them, Patchy promotes a slower, more intentional approach that encourages users to gradually build their own sense of cybersecurity. Patchy then provides a confidence statement to indicate how certain it is about the effectiveness of its solution. This helps maintain clear and transparent communication with the user.

After the analysis, Patchy suggests pull requests in GitHub, allowing users to accept or reject the proposed changes. The platform is simple to use and handles the heavy lifting of cybersecurity so developers can focus on building.

**How we built it**

To build a straightforward, clear, and concise site, we used React, Tailwind CSS, and TypeScript. This tech stack allowed us to focus on both UI and UX, minimizing unnecessary steps or obstacles so users feel encouraged to continue using the service. There’s no need to create an account, and a progress bar shows users how much longer the process will take, keeping them engaged.

**How we used Vellum**

To develop the backend and the logic for suggesting code fixes and identifying cybersecurity issues, we used GitHub’s API, Vellum, and an OpenAI API key. GitHub’s API allowed us to create pull requests, Vellum streamlined the process of building an AI agent, and the OpenAI API key powered the intelligence behind the Vellum AI agent. In particular, Vellum was used to systematically transform a JSON list representing all the files in a GitHub repo for easier prompting, seperate the vulnerability detecting and fixing phases of Patchy into 2 distinct steps, and easily introduce schemas to make sure the AI responses we recieved were in a standardized JSON format.

**Challenges we ran into**

Since this was our first time building and working with AI agents and large language models, we initially struggled to generate outputs efficiently. At first, suggesting code fixes and creating pull requests took over six minutes. We realized we were overprioritizing extremely high-quality outputs by using OpenAI’s o3 thinking model to power Vellum. After getting support from Vellum’s team, we switched to the o4 mini model and reduced the amount of the model took to think, which reduced our output time to just 45 seconds.

**Accomplishments that we're proud of**

Our group is most proud of being able to identify a wide range of cybersecurity vulnerabilities while suggesting fixes to users in a clean and streamlined way. Initially, we created a new file for every file that contained a vulnerability. But as we refined the process, we improved the AI agent so it modifies only specific, relevant lines directly within the original file. Being able to suggest fixes for all kinds of issues while keeping the experience simple and clear for users was something that made us really proud.

**What we learned**
After attending Hack the 6ix’s Figma workshop, we learned the importance of prioritizing both user experience and interface during development. No matter how impressive a project is, users won’t engage with it if it’s visually unappealing or difficult to use. We kept this in mind throughout the hackathon, which motivated us to build a site that is effortless to use, requires as few steps as possible, and is visually appealing so users are encouraged to stay and explore.

**What's next for Patchy**
Realistically, a single pull request won’t fix everything. We plan to integrate an AI assistant into the Patchy site, similar to tools like Cursor or Windsurf, so users can continuously prompt and ask questions without needing to paste their GitHub link over and over again.
