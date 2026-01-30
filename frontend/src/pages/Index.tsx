import { Link, useNavigate } from "react-router-dom";
import { Code2, Terminal, Cpu, Database, ArrowRight, CheckCircle2, User as UserIcon, LogOut, Check, Calendar, MapPin, HelpCircle, Box, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import PixelBlast from "@/component/PixelBlast";
import CardNav from "@/component/CardNav";
import logo from "./logo.svg";
import { useTasks } from "@/context/TaskContext";

// Helper to get icon based on difficulty/type
const getTaskIcon = (difficulty: string, type: string) => {
  if (type === 'debugging') return <CheckCircle2 className="w-6 h-6 text-red-400" />;
  if (type === 'riddle') return <HelpCircle className="w-6 h-6 text-yellow-400" />;
  if (type === 'blackbox') return <Box className="w-6 h-6 text-indigo-400" />;
  if (type === 'case-study') return <FileText className="w-6 h-6 text-pink-400" />;

  switch (difficulty) {
    case "Easy": return <Terminal className="w-6 h-6 text-green-400" />;
    case "Medium": return <Database className="w-6 h-6 text-blue-400" />;
    case "Hard": return <Cpu className="w-6 h-6 text-purple-400" />;
    case "Expert": return <Code2 className="w-6 h-6 text-orange-400" />;
    default: return <Code2 className="w-6 h-6 text-primary" />;
  }
};



const navItems = [
  {
    label: "About",
    bgColor: "#0D0716",
    textColor: "#fff",
    links: [
      { label: "Company", ariaLabel: "About Company", href: "#" },
      { label: "Careers", ariaLabel: "About Careers", href: "#" }
    ]
  },
  {
    label: "Projects",
    bgColor: "#170D27",
    textColor: "#fff",
    links: [
      { label: "Featured", ariaLabel: "Featured Projects", href: "#" },
      { label: "Case Studies", ariaLabel: "Project Case Studies", href: "#" }
    ]
  },
  {
    label: "Contact",
    bgColor: "#271E37",
    textColor: "#fff",
    links: [
      { label: "Email", ariaLabel: "Email us", href: "#" },
      { label: "Twitter", ariaLabel: "Twitter", href: "#" },
      { label: "LinkedIn", ariaLabel: "LinkedIn", href: "#" }
    ]
  }
];

const Index = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { tasks } = useTasks();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">


      <div className="absolute -top-6 w-full px-6 flex justify-between items-center z-50 pointer-events-none">
        <img
          src="/rec_logo.png"
          alt="REC Logo"
          className="w-32 h-auto object-contain hover:scale-105 transition-transform duration-300 pointer-events-auto"
        />
        <img
          src="/tita.png"
          alt="Titanium Logo"
          className="w-40 h-auto object-contain hover:scale-105 transition-transform duration-300 pointer-events-auto"
        />
        <img
          src="/in.png"
          alt="Inov Logo"
          className="w-40 h-auto object-contain hover:scale-105 transition-transform duration-300 pointer-events-auto"
        />
      </div>

      {/* Header */}


      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full z-0">
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#FFFFFF"
            patternScale={2}
            patternDensity={1}
            pixelSizeJitter={0}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.5}
            edgeFade={0.25}
            transparent
          />
        </div>
        <div className="container mx-auto max-w-5xl my-8 relative z-10 text-center">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-white/30 text-white uppercase tracking-wider bg-white/10 backdrop-blur-sm">
            {isAuthenticated ? `Welcome back, ${user?.username}` : "Coder's Playground"}
          </Badge>
          <div className="flex justify-center mb-8">
            <img
              src="/tech.png"
              alt="Techception"
              className="max-w-[90vw] md:max-w-xl h-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
            />
          </div>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-sm">
            Techception is a coding competition organized by Invovx REC, Chennai. Participants will be challenged to solve programming tasks in Python, C, or Java.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10 text-white/80 font-medium tracking-wide">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>FEBRUARY 12,2026 | 9:00 AM</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>Idea Factory | REC, CHENNAI</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-white/90" asChild>
              <Link to={isAuthenticated ? "#tasks" : "/login"}>
                {isAuthenticated ? "Solve Problems" : "Start Task"} <Code2 className="ml-2 w-4 h-4" />
              </Link>
            </Button>

            {isAuthenticated && (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 border-red-500/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 backdrop-blur-sm"
                onClick={logout}
              >
                Log Out <LogOut className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Tasks Grid */}
      <section id="tasks" className="flex-1 container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-primary" />
          Available Tasks
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map((task) => {
            const isCompleted = user?.completedTasks?.includes(task.id);
            const icon = getTaskIcon(task.difficulty, task.type);

            return (
              <Card key={task.id} className={`group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur-sm ${isCompleted ? "border-primary/20 bg-primary/5" : ""}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50 group-hover:scale-110 transition-transform">
                      {icon}
                    </div>
                    <div className="flex gap-2">
                      {isCompleted && (
                        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                          Completed <Check className="w-3 h-3 ml-1" />
                        </Badge>
                      )}

                      {task.type !== "coding" && (
                        <Badge variant="outline" className="px-3 capitalize border-primary/50 text-foreground">
                          {task.type.replace('-', ' ')}
                        </Badge>
                      )}

                      <Badge variant="secondary" className="px-3">
                        {task.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="mt-4 text-xl">{task.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {task.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Reward: <span className="text-primary font-bold">{task.points} XP</span>
                  </div>
                </CardContent>
                <CardFooter>
                  {isCompleted ? (
                    <Button className="w-full" variant="outline" disabled>
                      Access Locked <Check className="ml-2 w-4 h-4" />
                    </Button>
                  ) : (
                    <Button className="w-full group/btn" asChild variant="default">
                      <Link to={`/compiler?task=${task.id}`}>
                        Start Challenge
                        <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 CodeRunner. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
