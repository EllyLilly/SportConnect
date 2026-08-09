using FluentValidation;
using SportConnect.Core.DTOs.Meetings;

namespace SportConnect.API.Validators
{
    public class CreateMeetingValidator : AbstractValidator<CreateMeetingDto>
    {
        public CreateMeetingValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Заголовок обязателен")
                .Length(3, 100).WithMessage("Заголовок должен быть от 3 до 100 символов");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Описание не должно превышать 500 символов");

            RuleFor(x => x.ScheduledAt)
                .Must(date => date > DateTime.UtcNow.AddMinutes(30))
                .WithMessage("Время встречи должно быть не менее чем через 30 минут от текущего времени");

            RuleFor(x => x.MinParticipants)
                .InclusiveBetween(1, 30).WithMessage("Минимум участников от 1 до 30");

            RuleFor(x => x.MaxParticipants)
                .InclusiveBetween(1, 30).WithMessage("Максимум участников от 1 до 30");

            RuleFor(x => x)
                .Must(x => x.MaxParticipants >= x.MinParticipants)
                .WithMessage("Максимум участников должен быть не меньше минимума");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90, 90).WithMessage("Широта должна быть от -90 до 90");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180, 180).WithMessage("Долгота должна быть от -180 до 180");

            RuleFor(x => x.RequiredSkillLevel)
                .IsInEnum().WithMessage("Недопустимый уровень подготовки");

            RuleFor(x => x.SportId)
                .NotEmpty().WithMessage("Вид спорта обязателен");
        }
    }
}
