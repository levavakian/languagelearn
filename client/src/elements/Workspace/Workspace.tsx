import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { Topbar } from '../Topbar/Topbar';
import { NewCourseModal } from '../NewCourseModal/NewCourseModal';
import './Workspace.css';
import { ModalSelector, useStateValue, WorkPage } from '../../state/state';
import CourseView from '../CourseView/CourseView';
import Chat from '../Chat/Chat';
import { CourseList } from '../CourseList/CourseList';
import { NewLessonModal } from '../NewLessonModal/NewLessonModal';
import { Contact } from '../Contact/Contact';
import { FAQ } from '../FAQ/FAQ';

const Workspace = () => {
    const pageChoice = useStateValue(state => state.pageChoice);
    const modalSelector = useStateValue(state => state.modalSelector);

    return (
        <div className="workspace-container">
            <Sidebar />
            {modalSelector === ModalSelector.NewCourse && <NewCourseModal />}
            {modalSelector === ModalSelector.NewLesson && <NewLessonModal />}
            <div className="workspace-main">
                <Topbar />
                <div className="workspace-content">
                    {pageChoice.workPage === WorkPage.Course && <CourseView />}
                    {pageChoice.workPage === WorkPage.AllCourses && <CourseList />}
                    {pageChoice.workPage === WorkPage.Chat && <Chat />}
                    {pageChoice.workPage === WorkPage.Intro && <span>Intro</span>}
                    {pageChoice.workPage === WorkPage.Contact && <Contact />}
                    {pageChoice.workPage === WorkPage.FAQ && <FAQ />}
                </div>
            </div>
        </div>
    );
};

export default Workspace;
