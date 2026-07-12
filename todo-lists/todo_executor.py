#!/usr/bin/env python3
"""
KMainCMS UX Improvement To-Do Executor
Imports to-do list and generates prompts for sequential task execution
"""

import re
import json
from pathlib import Path

class TodoExecutor:
    def __init__(self, todo_file_path):
        self.todo_file_path = Path(todo_file_path)
        self.tasks = []
        self.current_index = 0
        self.load_tasks()
    
    def load_tasks(self):
        """Load and parse tasks from markdown file"""
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse markdown checkboxes
        pattern = r'- \[([ x])\] (.+)'
        matches = re.findall(pattern, content)
        
        self.tasks = []
        for status, description in matches:
            self.tasks.append({
                'completed': status == 'x',
                'description': description.strip(),
                'prompt': self.generate_prompt(description.strip())
            })
        
        # Find first incomplete task
        for i, task in enumerate(self.tasks):
            if not task['completed']:
                self.current_index = i
                break
        
        print(f"Loaded {len(self.tasks)} tasks from to-do list")
        print(f"First incomplete task: #{self.current_index + 1}")
    
    def generate_prompt(self, task_description):
        """Generate a specific prompt for executing a task"""
        # Clean up the task description
        clean_desc = task_description.rstrip('.')
        
        prompt = f"""I need you to implement the following UX improvement task for KMainCMS:

**Task:** {clean_desc}

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
        
        return prompt
    
    def get_current_task(self):
        """Get the current task to execute"""
        if self.current_index >= len(self.tasks):
            return None
        
        return self.tasks[self.current_index]
    
    def mark_complete(self):
        """Mark current task as complete"""
        if self.current_index < len(self.tasks):
            self.tasks[self.current_index]['completed'] = True
            self.save_progress()
            self.current_index += 1
            return True
        return False
    
    def save_progress(self):
        """Save progress back to markdown file"""
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace checkboxes based on completion status
        for i, task in enumerate(self.tasks):
            old_pattern = f"- [ ] {re.escape(task['description'])}"
            new_pattern = f"- [x] {task['description']}"
            
            if task['completed']:
                content = re.sub(old_pattern, new_pattern, content)
        
        with open(self.todo_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def get_progress(self):
        """Get overall progress"""
        completed = sum(1 for task in self.tasks if task['completed'])
        total = len(self.tasks)
        percentage = (completed / total * 100) if total > 0 else 0
        
        return {
            'completed': completed,
            'total': total,
            'percentage': percentage,
            'current': self.current_index + 1
        }
    
    def export_prompts(self, output_file):
        """Export all prompts to a file"""
        prompts = []
        for i, task in enumerate(self.tasks):
            if not task['completed']:
                prompts.append({
                    'task_number': i + 1,
                    'description': task['description'],
                    'prompt': task['prompt']
                })
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(prompts, f, indent=2)
        
        print(f"Exported {len(prompts)} prompts to {output_file}")

def main():
    # Initialize executor
    todo_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\UX_IMPROVEMENT_TODO.md"
    executor = TodoExecutor(todo_file)
    
    print("\n" + "="*60)
    print("KMainCMS UX Improvement To-Do Executor")
    print("="*60 + "\n")
    
    while True:
        # Show progress
        progress = executor.get_progress()
        print(f"\nProgress: {progress['completed']}/{progress['total']} tasks completed ({progress['percentage']:.1f}%)")
        print(f"Current task: #{progress['current']}\n")
        
        # Get current task
        current_task = executor.get_current_task()
        
        if current_task is None:
            print("\n🎉 All tasks completed!")
            break
        
        # Show current task
        print(f"Task: {current_task['description']}")
        print(f"Status: {'✅ Completed' if current_task['completed'] else '⏳ Pending'}")
        
        # Show prompt
        print("\n" + "="*60)
        print("GENERATED PROMPT:")
        print("="*60)
        print(current_task['prompt'])
        print("="*60 + "\n")
        
        # Menu options
        print("Options:")
        print("1. Mark as complete and move to next task")
        print("2. Skip this task (not recommended)")
        print("3. Export all remaining prompts to file")
        print("4. Show progress details")
        print("5. Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == '1':
            executor.mark_complete()
            print("✅ Task marked as complete!")
        elif choice == '2':
            executor.current_index += 1
            print("⏭️  Task skipped (not recommended)")
        elif choice == '3':
            output_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\remaining_prompts.json"
            executor.export_prompts(output_file)
        elif choice == '4':
            print("\nProgress Details:")
            print(f"Completed: {progress['completed']}")
            print(f"Remaining: {progress['total'] - progress['completed']}")
            print(f"Percentage: {progress['percentage']:.1f}%")
            
            # Show breakdown by phase
            print("\nPhase Breakdown:")
            phase_tasks = {
                'Phase 1': 52,
                'Phase 2': 35,
                'Phase 3': 40,
                'Phase 4': 50,
                'Design System': 119,
                'Additional': 23,
                'Testing': 9
            }
            
            completed_in_phase = 0
            current_phase = 'Phase 1'
            
            for i, task in enumerate(executor.tasks):
                if task['completed']:
                    completed_in_phase += 1
                    if completed_in_phase >= phase_tasks.get(current_phase, 0):
                        current_phase = list(phase_tasks.keys())[list(phase_tasks.keys()).index(current_phase) + 1] if current_phase in phase_tasks else current_phase
                        completed_in_phase = 0
            
            print(f"Current Phase: {current_phase}")
        elif choice == '5':
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
