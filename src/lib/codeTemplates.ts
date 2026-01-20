import { Language } from "@/components/LanguageSelector";

export const codeTemplates: Record<Language, string> = {
  python: `# Python 3.10
# Welcome to CodeRunner!

def greet(name):
    return f"Hello, {name}! Welcome to the online compiler."

def fibonacci(n):
    """Generate Fibonacci sequence up to n terms"""
    fib_sequence = []
    a, b = 0, 1
    for _ in range(n):
        fib_sequence.append(a)
        a, b = b, a + b
    return fib_sequence

# Main execution
if __name__ == "__main__":
    print(greet("Developer"))
    print()
    print("Fibonacci sequence (first 10 terms):")
    print(fibonacci(10))
`,

  c: `// C (GCC 10.2)
// Welcome to CodeRunner!

#include <stdio.h>

void greet(const char* name) {
    printf("Hello, %s! Welcome to the online compiler.\\n", name);
}

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    greet("Developer");
    
    printf("\\nFibonacci sequence (first 10 terms):\\n");
    for (int i = 0; i < 10; i++) {
        printf("%d ", fibonacci(i));
    }
    printf("\\n");
    
    return 0;
}
`,

  java: `// Java 15.0.2
// Welcome to CodeRunner!

public class Main {
    public static void greet(String name) {
        System.out.println("Hello, " + name + "! Welcome to the online compiler.");
    }
    
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
    
    public static void main(String[] args) {
        greet("Developer");
        
        System.out.println();
        System.out.println("Fibonacci sequence (first 10 terms):");
        for (int i = 0; i < 10; i++) {
            System.out.print(fibonacci(i) + " ");
        }
        System.out.println();
    }
}
`,
};
