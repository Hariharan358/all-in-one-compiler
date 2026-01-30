import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Code2, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Login = () => {
    const [teamName, setTeamName] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (teamName.trim() && password.trim()) {
            login(teamName, password);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />

            <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl relative z-10 animate-slide-up">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/tech.png"
                            alt="Techception Logo"
                            className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome Team</CardTitle>
                    <CardDescription>Enter your team credentials to start the challenge</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="teamName">Team Name</Label>
                            <Input
                                id="teamName"
                                placeholder="Enter your team name"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                className="bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter access code"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-background/50"
                            />
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        className="w-full font-semibold"
                        onClick={handleSubmit}
                        disabled={!teamName.trim() || !password.trim()}
                    >
                        Start Challenge <Zap className="w-4 h-4 ml-2 fill-current" />
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Don't have credentials? <span className="text-primary cursor-pointer hover:underline">Contact Event Organizers</span>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
