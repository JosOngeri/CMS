#!/usr/bin/env python3
"""
Simple Sequential Task Processor
Generates prompts one at a time and saves completion status
"""

import re
import json
from pathlib import Path
from datetime import datetime

class SequentialTaskProcessor:
    def __init__(self, todo_file_path, project_path):
        self.todo_file_path = Path(todo_file_path)
        self.project_path = Path(project_path)
        self.tasks = []
        self.current_index = 0
        self.completion_log = []
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
                'description': description.strip()
            })
        
        # Find first incomplete task
        for i, task in enumerate(self.tasks):
            if not task['completed']:
                self.current_index = i
                break
        
        print(f"Loaded {len(self.tasks)} tasks")
        print(f"Starting from task: #{self.current_index + 1}")
    
    def get_next_task(self):
        """Get the next incomplete task"""
        if self.current_index >= len(self.tasks):
            return None
        
        task = self.tasks[self.current_index]
        task_number = self.current_index + 1
        
        # Generate prompt
        clean_desc = task['description'].rstrip('.')
        
        prompt = f"""I need you to implement the following UX improvement task for KMainCMS:

**Task #{task_number}:** {clean_desc}

**Context:**
- This is part of the KMainCMS UX improvement project
- The project is located at: {self.project_path}
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

**Completion Feedback:**
After completing this task, please provide a brief summary of:
- What files were modified/created
- What specific changes were made
- Any issues encountered
- Whether the task was fully completed

**Please:**
1. First, analyze the current state
2. Then implement the changes
3. Finally, test and verify the implementation
4. Provide completion feedback summary

Let me know if you need any clarification about the task requirements."""
        
        return {
            'task_number': task_number,
            'description': task['description'],
            'prompt': prompt
        }
    
    def mark_complete(self, feedback):
        """Mark current task as complete and log feedback"""
        if self.current_index < len(self.tasks):
            task = self.tasks[self.current_index]
            task['completed'] = True
            
            # Log completion
            self.completion_log.append({
                'task_number': self.current_index + 1,
                'description': task['description'],
                'completed_at': datetime.now().isoformat(),
                'feedback': feedback
            })
            
            # Save progress
            self.save_progress()
            
            # Move to next task
            self.current_index += 1
            return True
        return False
    
    def save_progress(self):
        """Save progress to markdown and log files"""
        # Update markdown file
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for i, task in enumerate(self.tasks):
            old_pattern = f"- [ ] {re.escape(task['description'])}"
            new_pattern = f"- [x] {task['description']}"
            
            if task['completed']:
                content = re.sub(old_pattern, new_pattern, content)
        
        with open(self.todo_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Save completion log
        log_file = self.todo_file_path.parent / 'completion_log.json'
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self.completion_log, f, indent=2)
    
    def get_progress(self):
        """Get progress status"""
        completed = sum(1 for task in self.tasks if task['completed'])
        total = len(self.tasks)
        percentage = (completed / total * 100) if total > 0 else 0
        
        return {
            'completed': completed,
            'total': total,
            'percentage': percentage,
            'current': self.current_index + 1,
            'remaining': total - completed
        }
    
    def generate_feedback_report(self):
        """Generate readable feedback report"""
        progress = self.get_progress()
        
        report = []
        report.append("="*80)
        report.append("KMAINCMS UX IMPROVEMENT - COMPLETION REPORT")
        report.append("="*80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        report.append("PROGRESS SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Tasks: {progress['total']}")
        report.append(f"Completed: {progress['completed']}")
        report.append(f"Remaining: {progress['remaining']}")
        report.append(f"Progress: {progress['percentage']:.1f}%")
        report.append("")
        
        report.append("COMPLETED TASKS")
        report.append("-" * 40)
        for log in self.completion_log:
            report.append(f"✅ Task #{log['task_number']}: {log['description']}")
            report.append(f"   Completed: {log['completed_at']}")
            if log.get('feedback'):
                report.append(f"   Feedback: {log['feedback'][:100]}...")
            report.append("")
        
        if len(self.completion_log) == 0:
            report.append("No tasks completed yet.")
            report.append("")
        
        report.append("="*80)
        
        return "\n".join(report)

def main():
    todo_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\UX_IMPROVEMENT_TODO.md"
    project_path = "D:\\Kiserian Main SDA Communications Department\\KMainCMS"
    processor = SequentialTaskProcessor(todo_file, project_path)
    
    print("\n" + "="*60)
    print("KMainCMS UX Improvement - Sequential Task Processor")
    print("="*60 + "\n")
    
    while True:
        # Show progress
        progress = processor.get_progress()
        print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
        print(f"Current task: #{progress['current']}")
        print()
        
        # Get next task
        task = processor.get_next_task()
        
        if task is None:
            print("\n🎉 All tasks completed!")
            print("\n" + processor.generate_feedback_report())
            break
        
        # Show task and prompt
        print(f"Task #{task['task_number']}: {task['description']}")
        print("\n" + "="*60)
        print("PROMPT (Copy this to execute the task):")
        print("="*60)
        print(task['prompt'])
        print("="*60)
        print()
        
        # Get completion feedback
        print("After execution, provide brief feedback (or 'skip' to skip, 'exit' to save and exit):")
        feedback = input("Feedback: ").strip()
        
        if feedback.lower() == 'exit':
            print("\nSaving progress and generating report...")
            print(processor.generate_feedback_report())
            break
        elif feedback.lower() == 'skip':
            processor.current_index += 1
            print("Task skipped.")
        else:
            processor.mark_complete(feedback)
            print("✅ Task marked as complete!")

if __name__ == "__main__":
    main()
