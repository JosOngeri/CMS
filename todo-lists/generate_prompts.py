#!/usr/bin/env python3
"""
Simple Prompt Generator for KMainCMS UX Tasks
Exports individual prompts for each to-do item
"""

import re
from pathlib import Path

def generate_prompts():
    """Generate prompts for all incomplete tasks"""
    todo_file = Path("D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\UX_IMPROVEMENT_TODO.md")
    
    with open(todo_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse markdown checkboxes
    pattern = r'- \[ \] (.+)'
    matches = re.findall(pattern, content)
    
    prompts = []
    for i, description in enumerate(matches, 1):
        clean_desc = description.rstrip('.')
        
        prompt = f"""I need you to implement the following UX improvement task for KMainCMS:

**Task #{i}:** {clean_desc}

**Context:**
- This is part of the KMainCMS UX improvement project
- The project is located at: D:\\Kiserian Main SDA Communications Department\\KMainCMS
- Frontend is in: frontend\\
- Backend is in: backend\\
- The UX design document is at: docs\\KMainCMS_UX_DESIGN_DOCUMENT.md

**Requirements:**
1. Analyze the current implementation in the relevant files
2. Implement the required changes following the design specifications
3. Follow existing code patterns and conventions
4. Test the implementation
5. Update any relevant documentation

**Implementation Guidelines:**
- Use existing components and patterns where possible
- Follow the React/Vite architecture
- Use Tailwind CSS for styling
- Ensure accessibility (ARIA labels, keyboard navigation)
- Make it responsive (mobile, tablet, desktop)
- Add proper error handling

**Please:**
1. First, analyze the current state
2. Then implement the changes
3. Finally, test and verify the implementation

Let me know if you need any clarification about the task requirements."""
        
        prompts.append({
            'task_number': i,
            'description': clean_desc,
            'prompt': prompt
        })
    
    return prompts

def save_prompts(prompts, output_file):
    """Save prompts to a file"""
    with open(output_file, 'w', encoding='utf-8') as f:
        for task in prompts:
            f.write(f"{'='*80}\n")
            f.write(f"Task #{task['task_number']}: {task['description']}\n")
            f.write(f"{'='*80}\n\n")
            f.write(task['prompt'])
            f.write(f"\n\n{'='*80}\n\n")
    
    print(f"Generated {len(prompts)} prompts")
    print(f"Saved to: {output_file}")

def main():
    print("Generating prompts for KMainCMS UX improvement tasks...")
    prompts = generate_prompts()
    
    output_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\generated_prompts.txt"
    save_prompts(prompts, output_file)
    
    print(f"\nFirst 5 tasks:")
    for i in range(min(5, len(prompts))):
        print(f"{i+1}. {prompts[i]['description']}")
    
    print(f"\nTotal incomplete tasks: {len(prompts)}")
    print("\nYou can now copy prompts from generated_prompts.txt one at a time.")

if __name__ == "__main__":
    main()
