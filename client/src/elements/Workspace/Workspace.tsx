import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { Topbar } from '../Topbar/Topbar';
import './Workspace.css';
import { useStateValue, WorkPage } from '../../state/state';
import CourseView from '../CourseView/CourseView';
import Chat from '../Chat/Chat';
import { CourseList } from '../CourseList/CourseList';

const Workspace = () => {
    const pageChoice = useStateValue(state => state.pageChoice);

    return (
        <div className="workspace-container">
            <Sidebar />
            <div className="workspace-main">
                <Topbar />
                <div className="workspace-content">
                    {pageChoice.workPage === WorkPage.Course && <CourseView />}
                    {pageChoice.workPage === WorkPage.AllCourses && <CourseList />}
                    {pageChoice.workPage === WorkPage.Lesson && <span>Lesson</span>}
                    {pageChoice.workPage === WorkPage.Chat && <Chat />}
                    {pageChoice.workPage === WorkPage.Intro && <span>Intro</span>}
                </div>
            </div>
        </div>
    );
};

export default Workspace;
