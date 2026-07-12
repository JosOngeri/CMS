#!/usr/bin/env python3
"""
Smart Batch Processor - Groups tasks into larger logical batches
"""

import re
import json
from pathlib import Path
from datetime import datetime

class SmartBatchProcessor:
    def __init__(self, todo_file_path, project_path):
        self.todo_file_path = Path(todo_file_path)
        self.project_path = Path(project_path)
        self.tasks = []
        self.batches = []
        self.current_batch_index = 0
        self.completion_log = []
        self.load_tasks()
        self.create_smart_batches()
    
    def load_tasks(self):
        """Load and parse tasks from markdown file"""
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        pattern = r'- \[([ x])\] (.+)'
        matches = re.findall(pattern, content)
        
        self.tasks = []
        for status, description in matches:
            self.tasks.append({
                'completed': status == 'x',
                'description': description.strip(),
                'task_number': len(self.tasks) + 1
            })
        
        print(f"Loaded {len(self.tasks)} tasks")
    
    def create_smart_batches(self):
        """Create larger, more logical batches"""
        # Group by main sections (1-37)
        current_section = None
        batch_tasks = []
        
        for task in self.tasks:
            if task['completed']:
                continue
            
            # Detect main section from task number
            section = self.detect_section(task['description'], task['task_number'])
            
            # Start new batch if section changes or batch is large enough
            if section != current_section and batch_tasks:
                self.batches.append({
                    'section': current_section,
                    'tasks': batch_tasks,
                    'task_count': len(batch_tasks)
                })
                batch_tasks = []
                current_section = section
            
            batch_tasks.append(task)
            current_section = section
            
            # Start new batch if we have 10+ tasks
            if len(batch_tasks) >= 10:
                self.batches.append({
                    'section': current_section,
                    'tasks': batch_tasks,
                    'task_count': len(batch_tasks)
                })
                batch_tasks = []
        
        # Add final batch
        if batch_tasks:
            self.batches.append({
                'section': current_section,
                'tasks': batch_tasks,
                'task_count': len(batch_tasks)
            })
        
        print(f"Created {len(self.batches)} smart batches")
        for i, batch in enumerate(self.batches[:10]):  # Show first 10
            print(f"  Batch {i+1}: {batch['section']} ({batch['task_count']} tasks)")
        if len(self.batches) > 10:
            print(f"  ... and {len(self.batches) - 10} more batches")
    
    def detect_section(self, description, task_number):
        """Detect which main section a task belongs to"""
        desc_lower = description.lower()
        
        # Based on the main sections in the to-do list
        if task_number <= 52:
            return "Phase 1: Foundation"
        elif task_number <= 87:
            return "Phase 2: Organization"
        elif task_number <= 127:
            return "Phase 3: Advanced Features"
        elif task_number <= 177:
            return "Phase 4: Accessibility & Performance"
        elif task_number <= 296:
            return "Design System Implementation"
        elif task_number <= 319:
            return "Additional Critical Issues"
        elif task_number <= 328:
            return "Testing & Documentation"
        else:
            return "Additional Tasks"
    
    def get_current_batch(self):
        """Get the current batch to process"""
        if self.current_batch_index >= len(self.batches):
            return None
        
        return self.batches[self.current_batch_index]
    
    def generate_batch_prompt(self, batch):
        """Generate a combined prompt for the entire batch"""
        task_list = "\n".join([f"{i+1}. {task['description']}" for i, task in enumerate(batch['tasks'])])
        
        prompt = f"""I need you to implement the following batch of UX improvement tasks for KMainCMS:

**Batch:** {batch['section']}
**Number of Tasks:** {batch['task_count']}

**Tasks to Complete:**
{task_list}

**Context:**
- This is part of the KMainCMS UX improvement project
- The project is located at: {self.project_path}
- Frontend is in: frontend\\
- Backend is in: backend\\
- The UX design document is at: docs\\KMainCMS_UX_DESIGN_DOCUMENT.md

**Requirements:**
1. Analyze the current implementation for each task
2. Implement the required changes following the design specifications
3. Follow existing code patterns and conventions
4. Test each implementation
5. Update any relevant documentation

**Implementation Guidelines:**
- Use existing components and patterns where possible
- Follow the React/Vite architecture
- Use Tailwind CSS for styling
- Ensure accessibility (ARIA labels, keyboard navigation)
- Make everything responsive (mobile, tablet, desktop)
- Add proper error handling

**Completion Feedback:**
After completing this batch, please provide a summary of:
- Which tasks were completed
- What files were modified/created for each task
- Any issues encountered
- Whether all tasks in the batch were fully completed

**Please:**
1. Work through the tasks sequentially
2. Implement each task completely
3. Provide completion feedback for the entire batch

Let me know if you need any clarification about the task requirements."""
        
        return prompt
    
    def mark_batch_complete(self, feedback):
        """Mark all tasks in current batch as complete"""
        current_batch = self.get_current_batch()
        
        if current_batch:
            for task in current_batch['tasks']:
                task['completed'] = True
                
                self.completion_log.append({
                    'task_number': task['task_number'],
                    'description': task['description'],
                    'batch': current_batch['section'],
                    'completed_at': datetime.now().isoformat(),
                    'feedback': feedback
                })
            
            self.save_progress()
            self.current_batch_index += 1
            return True
        return False
    
    def save_progress(self):
        """Save progress to markdown and log files"""
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for task in self.tasks:
            old_pattern = f"- [ ] {re.escape(task['description'])}"
            new_pattern = f"- [x] {task['description']}"
            
            if task['completed']:
                content = re.sub(old_pattern, new_pattern, content)
        
        with open(self.todo_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        log_file = self.todo_file_path.parent / 'smart_batch_log.json'
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self.completion_log, f, indent=2)
    
    def get_progress(self):
        """Get overall progress"""
        completed = sum(1 for task in self.tasks if task['completed'])
        total = len(self.tasks)
        percentage = (completed / total * 100) if total > 0 else 0
        
        return {
            'completed': completed,
            'total': total,
            'percentage': percentage,
            'current_batch': self.current_batch_index + 1,
            'total_batches': len(self.batches),
            'remaining_batches': len(self.batches) - self.current_batch_index
        }
    
    def generate_feedback_report(self):
        """Generate readable feedback report"""
        progress = self.get_progress()
        
        report = []
        report.append("="*80)
        report.append("KMAINCMS UX IMPROVEMENT - SMART BATCH COMPLETION REPORT")
        report.append("="*80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        report.append("PROGRESS SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Tasks: {progress['total']}")
        report.append(f"Completed: {progress['completed']}")
        report.append(f"Remaining: {progress['total'] - progress['completed']}")
        report.append(f"Progress: {progress['percentage']:.1f}%")
        report.append(f"Total Batches: {progress['total_batches']}")
        report.append(f"Completed Batches: {progress['current_batch'] - 1}")
        report.append(f"Remaining Batches: {progress['remaining_batches']}")
        report.append("")
        
        report.append("SECTION COMPLETION SUMMARY")
        report.append("-" * 40)
        
        section_summary = {}
        for log in self.completion_log:
            section = log['batch']
            if section not in section_summary:
                section_summary[section] = 0
            section_summary[section] += 1
        
        for section, count in sorted(section_summary.items()):
            report.append(f"{section}: {count} tasks completed")
        
        report.append("")
        report.append("RECENTLY COMPLETED TASKS")
        report.append("-" * 40)
        
        recent_tasks = self.completion_log[-15:] if len(self.completion_log) > 15 else self.completion_log
        for log in recent_tasks:
            report.append(f"✅ Task #{log['task_number']}: {log['description']}")
            report.append(f"   Section: {log['batch']}")
            report.append(f"   Completed: {log['completed_at']}")
            if log.get('feedback'):
                report.append(f"   Feedback: {log['feedback'][:80]}...")
            report.append("")
        
        if len(self.completion_log) == 0:
            report.append("No tasks completed yet.")
            report.append("")
        
        report.append("="*80)
        
        return "\n".join(report)

def main():
    todo_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\UX_IMPROVEMENT_TODO.md"
    project_path = "D:\\Kiserian Main SDA Communications Department\\KMainCMS"
    processor = SmartBatchProcessor(todo_file, project_path)
    
    print("\n" + "="*60)
    print("KMainCMS UX Improvement - Smart Batch Processor")
    print("="*60 + "\n")
    
    progress = processor.get_progress()
    print(f"Initial Progress: {progress['completed']}/{progress['total']} tasks completed ({progress['percentage']:.1f}%)")
    print(f"Total Batches: {progress['total_batches']}")
    print(f"Starting from batch: {progress['current_batch']}")
    print()
    
    while True:
        progress = processor.get_progress()
        print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
        print(f"Batch: {progress['current_batch']}/{progress['total_batches']}")
        print()
        
        current_batch = processor.get_current_batch()
        
        if current_batch is None:
            print("\n🎉 All batches completed!")
            print("\n" + processor.generate_feedback_report())
            break
        
        print(f"{'='*60}")
        print(f"CURRENT BATCH: {progress['current_batch']}")
        print(f"{'='*60}")
        print(f"Section: {current_batch['section']}")
        print(f"Tasks: {current_batch['task_count']}")
        print()
        
        print("First 5 tasks in this batch:")
        for i, task in enumerate(current_batch['tasks'][:5]):
            print(f"  {i+1}. {task['description']}")
        if current_batch['task_count'] > 5:
            print(f"  ... and {current_batch['task_count'] - 5} more tasks")
        print()
        
        print("-" * 40)
        print("BATCH PROMPT (Copy this to execute the entire batch):")
        print("-" * 40)
        print(processor.generate_batch_prompt(current_batch))
        print("-" * 40)
        print()
        
        print("After execution, provide feedback (or 'skip' to skip, 'exit' to save):")
        feedback = input("Feedback: ").strip()
        
        if feedback.lower() == 'exit':
            print("\nSaving progress and generating report...")
            print(processor.generate_feedback_report())
            break
        elif feedback.lower() == 'skip':
            processor.current_batch_index += 1
            print("Batch skipped.")
        else:
            processor.mark_batch_complete(feedback)
            print(f"✅ Batch marked as complete! ({current_batch['task_count']} tasks)")
            
            progress = processor.get_progress()
            print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
        
        print("\n" + "-"*60)
        input("Press Enter to continue to next batch...")
        print("-" * 60)

if __name__ == "__main__":
    main()
