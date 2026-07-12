#!/usr/bin/env python3
"""
Batch Task Processor for KMainCMS UX Improvement
Groups tasks into logical batches and processes them sequentially
"""

import re
import json
from pathlib import Path
from datetime import datetime

class BatchTaskProcessor:
    def __init__(self, todo_file_path, project_path):
        self.todo_file_path = Path(todo_file_path)
        self.project_path = Path(project_path)
        self.tasks = []
        self.batches = []
        self.current_batch_index = 0
        self.completion_log = []
        self.load_tasks()
        self.create_batches()
    
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
                'task_number': len(self.tasks) + 1
            })
        
        print(f"Loaded {len(self.tasks)} tasks from to-do list")
    
    def create_batches(self):
        """Group tasks into logical batches"""
        # Group by phase and category
        current_phase = None
        current_category = None
        batch_tasks = []
        
        for task in self.tasks:
            if task['completed']:
                continue
            
            # Determine phase from task description
            phase = self.detect_phase(task['description'])
            category = self.detect_category(task['description'])
            
            # Start new batch if phase or category changes
            if phase != current_phase or category != current_category or len(batch_tasks) >= 10:
                if batch_tasks:
                    self.batches.append({
                        'phase': current_phase,
                        'category': current_category,
                        'tasks': batch_tasks,
                        'task_count': len(batch_tasks)
                    })
                
                batch_tasks = []
                current_phase = phase
                current_category = category
            
            batch_tasks.append(task)
        
        # Add final batch
        if batch_tasks:
            self.batches.append({
                'phase': current_phase,
                'category': current_category,
                'tasks': batch_tasks,
                'task_count': len(batch_tasks)
            })
        
        print(f"Created {len(self.batches)} logical batches")
        for i, batch in enumerate(self.batches):
            print(f"  Batch {i+1}: {batch['phase']} - {batch['category']} ({batch['task_count']} tasks)")
    
    def detect_phase(self, description):
        """Detect which phase a task belongs to"""
        desc_lower = description.lower()
        
        if any(keyword in desc_lower for keyword in ['role-based dashboard', 'stats card', 'quick action', 'data table', 'status badge']):
            return 'Phase 1: Foundation'
        elif any(keyword in desc_lower for keyword in ['settings', 'breadcrumb', 'empty state', 'tab-based']):
            return 'Phase 2: Organization'
        elif any(keyword in desc_lower for keyword in ['permission', 'approval workflow', 'export', 'reporting', 'activity feed']):
            return 'Phase 3: Advanced Features'
        elif any(keyword in desc_lower for keyword in ['accessibility', 'aria', 'keyboard', 'screen reader', 'contrast', 'performance', 'mobile', 'responsive']):
            return 'Phase 4: Accessibility & Performance'
        elif any(keyword in desc_lower for keyword in ['color', 'typography', 'spacing', 'border', 'shadow', 'icon', 'animation', 'z-index']):
            return 'Design System'
        elif any(keyword in desc_lower for keyword in ['toast', 'loading', 'pagination', 'button', 'window.confirm', 'console', 'undo', 'offline']):
            return 'Additional Issues'
        elif any(keyword in desc_lower for keyword in ['e2e', 'test', 'documentation']):
            return 'Testing & Documentation'
        else:
            return 'Other'
    
    def detect_category(self, description):
        """Detect category within a phase"""
        desc_lower = description.lower()
        
        if 'dashboard' in desc_lower:
            return 'Dashboard'
        elif 'member' in desc_lower:
            return 'Members'
        elif 'gallery' in desc_lower:
            return 'Gallery'
        elif 'department' in desc_lower:
            return 'Departments'
        elif 'document' in desc_lower:
            return 'Documents'
        elif 'payment' in desc_lower or 'treasury' in desc_lower:
            return 'Payments'
        elif 'sms' in desc_lower:
            return 'SMS'
        elif 'announcement' in desc_lower:
            return 'Announcements'
        elif 'approval' in desc_lower:
            return 'Approvals'
        elif 'setting' in desc_lower:
            return 'Settings'
        elif 'color' in desc_lower:
            return 'Color System'
        elif 'typography' in desc_lower or 'font' in desc_lower:
            return 'Typography'
        elif 'spacing' in desc_lower:
            return 'Spacing'
        elif 'border' in desc_lower:
            return 'Border Radius'
        elif 'shadow' in desc_lower:
            return 'Shadows'
        elif 'icon' in desc_lower:
            return 'Icons'
        elif 'animation' in desc_lower:
            return 'Animations'
        elif 'z-index' in desc_lower:
            return 'Z-Index'
        elif 'responsive' in desc_lower or 'mobile' in desc_lower:
            return 'Responsive'
        elif 'aria' in desc_lower or 'accessibility' in desc_lower:
            return 'Accessibility'
        elif 'performance' in desc_lower:
            return 'Performance'
        else:
            return 'General'
    
    def get_current_batch(self):
        """Get the current batch to process"""
        if self.current_batch_index >= len(self.batches):
            return None
        
        return self.batches[self.current_batch_index]
    
    def generate_batch_prompt(self, batch):
        """Generate a combined prompt for the entire batch"""
        task_list = "\n".join([f"{i+1}. {task['description']}" for i, task in enumerate(batch['tasks'])])
        
        prompt = f"""I need you to implement the following batch of UX improvement tasks for KMainCMS:

**Batch:** {batch['phase']} - {batch['category']}
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
                
                # Log completion
                self.completion_log.append({
                    'task_number': task['task_number'],
                    'description': task['description'],
                    'batch': f"{current_batch['phase']} - {current_batch['category']}",
                    'completed_at': datetime.now().isoformat(),
                    'feedback': feedback
                })
            
            # Save progress
            self.save_progress()
            
            # Move to next batch
            self.current_batch_index += 1
            return True
        return False
    
    def save_progress(self):
        """Save progress to markdown and log files"""
        # Update markdown file
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for task in self.tasks:
            old_pattern = f"- [ ] {re.escape(task['description'])}"
            new_pattern = f"- [x] {task['description']}"
            
            if task['completed']:
                content = re.sub(old_pattern, new_pattern, content)
        
        with open(self.todo_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Save completion log
        log_file = self.todo_file_path.parent / 'batch_completion_log.json'
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
        report.append("KMAINCMS UX IMPROVEMENT - BATCH COMPLETION REPORT")
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
        
        report.append("BATCH COMPLETION SUMMARY")
        report.append("-" * 40)
        
        # Group by phase
        phase_summary = {}
        for log in self.completion_log:
            phase = log['batch']
            if phase not in phase_summary:
                phase_summary[phase] = 0
            phase_summary[phase] += 1
        
        for phase, count in sorted(phase_summary.items()):
            report.append(f"{phase}: {count} tasks completed")
        
        report.append("")
        report.append("RECENTLY COMPLETED TASKS")
        report.append("-" * 40)
        
        # Show last 20 completed tasks
        recent_tasks = self.completion_log[-20:] if len(self.completion_log) > 20 else self.completion_log
        for log in recent_tasks:
            report.append(f"✅ Task #{log['task_number']}: {log['description']}")
            report.append(f"   Batch: {log['batch']}")
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
    processor = BatchTaskProcessor(todo_file, project_path)
    
    print("\n" + "="*60)
    print("KMainCMS UX Improvement - Batch Task Processor")
    print("="*60 + "\n")
    
    # Show initial progress
    progress = processor.get_progress()
    print(f"Initial Progress: {progress['completed']}/{progress['total']} tasks completed ({progress['percentage']:.1f}%)")
    print(f"Total Batches: {progress['total_batches']}")
    print(f"Starting from batch: {progress['current_batch']}")
    print()
    
    while True:
        # Show progress
        progress = processor.get_progress()
        print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
        print(f"Batch: {progress['current_batch']}/{progress['total_batches']}")
        print()
        
        # Get current batch
        current_batch = processor.get_current_batch()
        
        if current_batch is None:
            print("\n🎉 All batches completed!")
            print("\n" + processor.generate_feedback_report())
            break
        
        # Show batch info
        print(f"{'='*60}")
        print(f"CURRENT BATCH: {progress['current_batch']}")
        print(f"{'='*60}")
        print(f"Phase: {current_batch['phase']}")
        print(f"Category: {current_batch['category']}")
        print(f"Tasks: {current_batch['task_count']}")
        print()
        
        # Show task list
        print("Tasks in this batch:")
        for i, task in enumerate(current_batch['tasks']):
            print(f"  {i+1}. {task['description']}")
        print()
        
        # Show prompt
        print("-" * 40)
        print("BATCH PROMPT (Copy this to execute the entire batch):")
        print("-" * 40)
        print(processor.generate_batch_prompt(current_batch))
        print("-" * 40)
        print()
        
        # Get completion feedback
        print("After executing the batch, provide completion feedback.")
        print("Include: which tasks completed, files modified, any issues")
        print("Type 'skip' to skip this batch, 'exit' to save and exit:")
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
            
            # Update progress
            progress = processor.get_progress()
            print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
        
        print("\n" + "-"*60)
        input("Press Enter to continue to next batch...")
        print("-" * 60)

if __name__ == "__main__":
    main()
